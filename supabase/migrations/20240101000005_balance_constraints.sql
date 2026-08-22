-- Fix Phase: Balance calculation correctness and payment constraints
-- Fixes C1 (cartesian JOIN double-count), M2 (opening_balance ignored), M10 (negative payments)

-- ============================================
-- M10: PAYMENTS.AMOUNT MUST BE POSITIVE
-- ============================================
ALTER TABLE payments
  ADD CONSTRAINT payments_amount_positive CHECK (amount > 0);

-- ============================================
-- C1 + M2: REWRITE RECALCULATE BRANCH BALANCE
-- Fix cartesian fan-out by aggregating each side independently,
-- and include opening_balance in the canonical balance.
-- ============================================
CREATE OR REPLACE FUNCTION recalculate_branch_balance(
  p_branch_id UUID
) RETURNS NUMERIC(12,2) AS $$
DECLARE
  v_opening NUMERIC(12,2);
  v_sales NUMERIC(12,2);
  v_payments NUMERIC(12,2);
  v_balance NUMERIC(12,2);
BEGIN
  SELECT opening_balance INTO v_opening
  FROM branches
  WHERE id = p_branch_id;

  SELECT COALESCE(SUM(total_sales_amount), 0) INTO v_sales
  FROM deliveries
  WHERE branch_id = p_branch_id AND deleted_at IS NULL;

  SELECT COALESCE(SUM(amount), 0) INTO v_payments
  FROM payments
  WHERE branch_id = p_branch_id AND deleted_at IS NULL;

  v_balance := COALESCE(v_opening, 0) + v_sales - v_payments;

  UPDATE branches
  SET current_balance = v_balance
  WHERE id = p_branch_id;

  RETURN v_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

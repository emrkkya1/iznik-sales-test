-- ============================================
-- M15: FLIP BALANCE SIGN CONVENTION
-- ============================================
--
-- Mental model across the whole app: "+ means we got money" (cash-flow
-- perspective). Previously the DB stored "branch's debt to us" (positive
-- = they owe us). This migration flips the on-disk formula and
-- re-derives every existing branches.current_balance so the on-disk
-- value matches the new convention.
--
-- Before: balance = opening + sales - payments
-- After:  balance = opening + payments - sales
--
-- Existing branches get re-recalculated inline so their stored value
-- reflects the new convention immediately.

DROP FUNCTION IF EXISTS recalculate_branch_balance(UUID);

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

  -- FLIPPED: payments - sales (was: sales - payments)
  v_balance := COALESCE(v_opening, 0) + v_payments - v_sales;

  UPDATE branches
  SET current_balance = v_balance
  WHERE id = p_branch_id;

  RETURN v_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog;

-- Re-recalculate every existing branch so stored current_balance matches
-- the new convention. Without this, every branch's stored value would be
-- the negation of what it should be until something triggered
-- recalculate_branch_balance.
DO $$
DECLARE
  branch_record RECORD;
BEGIN
  FOR branch_record IN SELECT id FROM branches LOOP
    PERFORM recalculate_branch_balance(branch_record.id);
  END LOOP;
END $$;
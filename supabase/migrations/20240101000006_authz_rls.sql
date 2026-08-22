-- Fix Phase: Authorization and RLS hardening
-- Fixes C3 (role escalation), C4 (RPC authz), M3 (staff see-all), L1 (search_path), M9 (grants)

-- ============================================
-- C3: PREVENT ROLE ESCALATION
-- Non-admin users cannot change role, is_active, or id on their own profile.
-- ============================================
CREATE OR REPLACE FUNCTION prevent_role_escalation() RETURNS TRIGGER AS $$
BEGIN
  IF NOT is_admin() THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Cannot change role';
    END IF;
    IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
      RAISE EXCEPTION 'Cannot change active status';
    END IF;
    IF NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'Cannot change user id';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER users_no_escalation
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION prevent_role_escalation();

-- ============================================
-- M3: STAFF CAN SEE ALL OWN DELIVERIES (edit stays today-only)
-- ============================================
DROP POLICY IF EXISTS staff_select_own_deliveries ON deliveries;

CREATE POLICY staff_select_own_deliveries ON deliveries
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    AND deleted_at IS NULL
  );

-- ============================================
-- C4 + L1: RE-DECLARE MUTATION RPCS WITH ACTOR VALIDATION
-- ============================================

-- CREATE DELIVERY: staff restricted to today + field_collection; idempotency via ON CONFLICT (L7)
CREATE OR REPLACE FUNCTION create_delivery_atomic(
  p_branch_id UUID,
  p_items JSONB,
  p_payment_amount NUMERIC(12,2),
  p_payment_type TEXT,
  p_date DATE,
  p_idempotency_key TEXT
) RETURNS UUID AS $$
DECLARE
  v_delivery_id UUID;
  v_total_amount NUMERIC(12,2) := 0;
  v_item JSONB;
  v_branch_product_id UUID;
  v_unit_price NUMERIC(12,2);
  v_net_quantity NUMERIC(12,2);
  v_today DATE;
BEGIN
  -- Authorization: staff can only create today's deliveries with field collections
  IF NOT is_admin() THEN
    v_today := (NOW() AT TIME ZONE 'Europe/Istanbul')::DATE;
    IF p_date <> v_today THEN
      RAISE EXCEPTION 'Staff can only create today''s deliveries';
    END IF;
    IF p_payment_type <> 'field_collection' THEN
      RAISE EXCEPTION 'Staff can only record field collections';
    END IF;
  END IF;

  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'At least one item is required';
  END IF;

  -- Insert header with idempotency guard (race-safe)
  INSERT INTO deliveries (branch_id, user_id, total_sales_amount, date, idempotency_key)
  VALUES (p_branch_id, auth.uid(), 0, p_date, p_idempotency_key)
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id INTO v_delivery_id;

  IF v_delivery_id IS NULL THEN
    SELECT id INTO v_delivery_id
    FROM deliveries
    WHERE idempotency_key = p_idempotency_key;
    RETURN v_delivery_id;
  END IF;

  -- Process each item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT id INTO v_branch_product_id
    FROM branch_products
    WHERE branch_id = p_branch_id
      AND product_id = (v_item->>'product_id')::UUID
      AND is_active = TRUE;

    IF v_branch_product_id IS NULL THEN
      RAISE EXCEPTION 'Product not available at this branch';
    END IF;

    v_unit_price := get_effective_price(v_branch_product_id, p_date);

    IF v_unit_price IS NULL THEN
      RAISE EXCEPTION 'No price found for product on date %', p_date;
    END IF;

    v_net_quantity := (v_item->>'delivered_quantity')::NUMERIC
                    - (v_item->>'returned_quantity')::NUMERIC;

    v_total_amount := v_total_amount + (v_net_quantity * v_unit_price);

    INSERT INTO delivery_items (
      delivery_id, product_id, delivered_quantity, returned_quantity, unit_price
    ) VALUES (
      v_delivery_id,
      (v_item->>'product_id')::UUID,
      (v_item->>'delivered_quantity')::NUMERIC,
      (v_item->>'returned_quantity')::NUMERIC,
      v_unit_price
    );
  END LOOP;

  UPDATE deliveries
  SET total_sales_amount = v_total_amount
  WHERE id = v_delivery_id;

  IF p_payment_amount > 0 THEN
    INSERT INTO payments (branch_id, user_id, delivery_id, amount, payment_type, date)
    VALUES (p_branch_id, auth.uid(), v_delivery_id, p_payment_amount, p_payment_type, p_date);
  END IF;

  PERFORM recalculate_branch_balance(p_branch_id);

  PERFORM log_audit('INSERT', 'deliveries', v_delivery_id, NULL);

  RETURN v_delivery_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- UPDATE DELIVERY: staff only own + today + before deadline; admin unrestricted
CREATE OR REPLACE FUNCTION update_delivery_atomic(
  p_delivery_id UUID,
  p_items JSONB,
  p_date DATE
) RETURNS VOID AS $$
DECLARE
  v_branch_id UUID;
  v_total_amount NUMERIC(12,2) := 0;
  v_item JSONB;
  v_branch_product_id UUID;
  v_unit_price NUMERIC(12,2);
  v_net_quantity NUMERIC(12,2);
  v_old_data JSONB;
  v_owner UUID;
  v_delivery_date DATE;
BEGIN
  SELECT branch_id, user_id, date, row_to_json(d)
    INTO v_branch_id, v_owner, v_delivery_date, v_old_data
  FROM deliveries d
  WHERE id = p_delivery_id AND deleted_at IS NULL;

  IF v_branch_id IS NULL THEN
    RAISE EXCEPTION 'Delivery not found or already deleted';
  END IF;

  -- Authorization: staff can only edit their own today delivery before 23:59
  IF NOT is_admin() THEN
    IF v_owner <> auth.uid() THEN
      RAISE EXCEPTION 'Not authorized to edit this delivery';
    END IF;
    IF v_delivery_date <> (NOW() AT TIME ZONE 'Europe/Istanbul')::DATE THEN
      RAISE EXCEPTION 'Staff can only edit today''s deliveries';
    END IF;
    IF (NOW() AT TIME ZONE 'Europe/Istanbul')::TIME >= '23:59:00' THEN
      RAISE EXCEPTION 'Edit deadline has passed';
    END IF;
  END IF;

  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'At least one item is required';
  END IF;

  DELETE FROM delivery_items WHERE delivery_id = p_delivery_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT id INTO v_branch_product_id
    FROM branch_products
    WHERE branch_id = v_branch_id
      AND product_id = (v_item->>'product_id')::UUID
      AND is_active = TRUE;

    IF v_branch_product_id IS NULL THEN
      RAISE EXCEPTION 'Product not available at this branch';
    END IF;

    v_unit_price := get_effective_price(v_branch_product_id, p_date);

    IF v_unit_price IS NULL THEN
      RAISE EXCEPTION 'No price found for product on date %', p_date;
    END IF;

    v_net_quantity := (v_item->>'delivered_quantity')::NUMERIC
                    - (v_item->>'returned_quantity')::NUMERIC;

    v_total_amount := v_total_amount + (v_net_quantity * v_unit_price);

    INSERT INTO delivery_items (
      delivery_id, product_id, delivered_quantity, returned_quantity, unit_price
    ) VALUES (
      p_delivery_id,
      (v_item->>'product_id')::UUID,
      (v_item->>'delivered_quantity')::NUMERIC,
      (v_item->>'returned_quantity')::NUMERIC,
      v_unit_price
    );
  END LOOP;

  UPDATE deliveries
  SET total_sales_amount = v_total_amount
  WHERE id = p_delivery_id;

  PERFORM recalculate_branch_balance(v_branch_id);

  PERFORM log_audit('UPDATE', 'deliveries', p_delivery_id, v_old_data);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- SOFT DELETE DELIVERY: admin only
CREATE OR REPLACE FUNCTION soft_delete_delivery_atomic(
  p_delivery_id UUID,
  p_deletion_reason TEXT
) RETURNS VOID AS $$
DECLARE
  v_branch_id UUID;
  v_old_data JSONB;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized to delete deliveries';
  END IF;

  SELECT branch_id, row_to_json(d) INTO v_branch_id, v_old_data
  FROM deliveries d
  WHERE id = p_delivery_id AND deleted_at IS NULL;

  IF v_branch_id IS NULL THEN
    RAISE EXCEPTION 'Delivery not found or already deleted';
  END IF;

  UPDATE deliveries
  SET deleted_at = NOW(),
      deleted_by = auth.uid(),
      deletion_reason = p_deletion_reason
  WHERE id = p_delivery_id;

  UPDATE payments
  SET deleted_at = NOW(),
      deleted_by = auth.uid(),
      deletion_reason = p_deletion_reason
  WHERE delivery_id = p_delivery_id AND deleted_at IS NULL;

  PERFORM recalculate_branch_balance(v_branch_id);

  PERFORM log_audit('DELETE', 'deliveries', p_delivery_id, v_old_data, p_deletion_reason);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- RECORD MANUAL PAYMENT: admin only
CREATE OR REPLACE FUNCTION record_manual_payment_atomic(
  p_branch_id UUID,
  p_amount NUMERIC(12,2),
  p_payment_type TEXT,
  p_date DATE
) RETURNS UUID AS $$
DECLARE
  v_payment_id UUID;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized to record payments';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be positive';
  END IF;

  INSERT INTO payments (branch_id, user_id, delivery_id, amount, payment_type, date)
  VALUES (p_branch_id, auth.uid(), NULL, p_amount, p_payment_type, p_date)
  RETURNING id INTO v_payment_id;

  PERFORM recalculate_branch_balance(p_branch_id);

  PERFORM log_audit('INSERT', 'payments', v_payment_id, NULL);

  RETURN v_payment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- GET BRANCH BALANCE: admin only (staff read balance via their receipt)
CREATE OR REPLACE FUNCTION get_branch_balance(
  p_branch_id UUID
) RETURNS NUMERIC(12,2) AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized to view balances';
  END IF;

  RETURN (
    SELECT current_balance
    FROM branches
    WHERE id = p_branch_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- ============================================
-- L1: HARDEN REMAINING SECURITY DEFINER HELPERS
-- ============================================
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin' AND is_active = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION log_audit(
  p_operation_type TEXT,
  p_table_name TEXT,
  p_record_id UUID,
  p_old_data JSONB DEFAULT NULL,
  p_deletion_reason TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO audit_logs (operation_type, table_name, record_id, user_id, old_data, deletion_reason)
  VALUES (p_operation_type, p_table_name, p_record_id, auth.uid(), p_old_data, p_deletion_reason);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION get_effective_price(
  p_branch_product_id UUID,
  p_date DATE
) RETURNS NUMERIC(12,2) AS $$
BEGIN
  RETURN (
    SELECT price
    FROM branch_product_prices
    WHERE branch_product_id = p_branch_product_id
      AND start_date <= p_date
      AND (end_date IS NULL OR end_date >= p_date)
    ORDER BY start_date DESC
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- ============================================
-- M9: EXPLICITLY EXPOSE CLIENT-FACING RPCS
-- ============================================
GRANT EXECUTE ON FUNCTION create_delivery_atomic(UUID, JSONB, NUMERIC, TEXT, DATE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_delivery_atomic(UUID, JSONB, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION soft_delete_delivery_atomic(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION record_manual_payment_atomic(UUID, NUMERIC, TEXT, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_branch_balance(UUID) TO authenticated;

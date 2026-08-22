-- Phase 2: Database Functions
-- Atomic operations for financial integrity

-- ============================================
-- AUDIT LOGGING HELPER
-- ============================================
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- GET EFFECTIVE PRICE
-- ============================================
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
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RECALCULATE BRANCH BALANCE
-- ============================================
CREATE OR REPLACE FUNCTION recalculate_branch_balance(
  p_branch_id UUID
) RETURNS NUMERIC(12,2) AS $$
DECLARE
  v_balance NUMERIC(12,2);
BEGIN
  SELECT 
    COALESCE(SUM(d.total_sales_amount), 0) - COALESCE(SUM(p.amount), 0)
  INTO v_balance
  FROM branches b
  LEFT JOIN deliveries d ON d.branch_id = b.id AND d.deleted_at IS NULL
  LEFT JOIN payments p ON p.branch_id = b.id AND p.deleted_at IS NULL
  WHERE b.id = p_branch_id
  GROUP BY b.id;
  
  UPDATE branches 
  SET current_balance = v_balance 
  WHERE id = p_branch_id;
  
  RETURN v_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- CREATE DELIVERY ATOMIC
-- ============================================
CREATE OR REPLACE FUNCTION create_delivery_atomic(
  p_branch_id UUID,
  p_items JSONB,  -- [{product_id, delivered_quantity, returned_quantity}]
  p_payment_amount NUMERIC(12,2),
  p_payment_type TEXT,
  p_date DATE
) RETURNS UUID AS $$
DECLARE
  v_delivery_id UUID;
  v_total_amount NUMERIC(12,2) := 0;
  v_item JSONB;
  v_branch_product_id UUID;
  v_unit_price NUMERIC(12,2);
  v_net_quantity NUMERIC(12,2);
BEGIN
  -- Create delivery header (total will be updated after items)
  INSERT INTO deliveries (branch_id, user_id, total_sales_amount, date)
  VALUES (p_branch_id, auth.uid(), 0, p_date)
  RETURNING id INTO v_delivery_id;
  
  -- Process each item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    -- Get branch_product_id
    SELECT id INTO v_branch_product_id
    FROM branch_products
    WHERE branch_id = p_branch_id 
      AND product_id = (v_item->>'product_id')::UUID
      AND is_active = TRUE;
    
    IF v_branch_product_id IS NULL THEN
      RAISE EXCEPTION 'Product not available at this branch';
    END IF;
    
    -- Get effective price for the date
    v_unit_price := get_effective_price(v_branch_product_id, p_date);
    
    IF v_unit_price IS NULL THEN
      RAISE EXCEPTION 'No price found for product on date %', p_date;
    END IF;
    
    -- Calculate net quantity
    v_net_quantity := (v_item->>'delivered_quantity')::NUMERIC 
                    - (v_item->>'returned_quantity')::NUMERIC;
    
    -- Add to total
    v_total_amount := v_total_amount + (v_net_quantity * v_unit_price);
    
    -- Insert delivery item with price snapshot
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
  
  -- Update delivery total
  UPDATE deliveries 
  SET total_sales_amount = v_total_amount 
  WHERE id = v_delivery_id;
  
  -- Create payment if amount > 0
  IF p_payment_amount > 0 THEN
    INSERT INTO payments (branch_id, user_id, delivery_id, amount, payment_type, date)
    VALUES (p_branch_id, auth.uid(), v_delivery_id, p_payment_amount, p_payment_type, p_date);
  END IF;
  
  -- Recalculate branch balance
  PERFORM recalculate_branch_balance(p_branch_id);
  
  -- Log audit
  PERFORM log_audit('INSERT', 'deliveries', v_delivery_id, NULL);
  
  RETURN v_delivery_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- UPDATE DELIVERY ATOMIC
-- ============================================
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
BEGIN
  -- Get branch_id and old data for audit
  SELECT branch_id, row_to_json(d) INTO v_branch_id, v_old_data
  FROM deliveries d
  WHERE id = p_delivery_id AND deleted_at IS NULL;
  
  IF v_branch_id IS NULL THEN
    RAISE EXCEPTION 'Delivery not found or already deleted';
  END IF;
  
  -- Delete existing items
  DELETE FROM delivery_items WHERE delivery_id = p_delivery_id;
  
  -- Process each item
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
  
  -- Update delivery total
  UPDATE deliveries 
  SET total_sales_amount = v_total_amount 
  WHERE id = p_delivery_id;
  
  -- Recalculate balance
  PERFORM recalculate_branch_balance(v_branch_id);
  
  -- Log audit
  PERFORM log_audit('UPDATE', 'deliveries', p_delivery_id, v_old_data);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SOFT DELETE DELIVERY ATOMIC
-- ============================================
CREATE OR REPLACE FUNCTION soft_delete_delivery_atomic(
  p_delivery_id UUID,
  p_deletion_reason TEXT
) RETURNS VOID AS $$
DECLARE
  v_branch_id UUID;
  v_old_data JSONB;
BEGIN
  SELECT branch_id, row_to_json(d) INTO v_branch_id, v_old_data
  FROM deliveries d
  WHERE id = p_delivery_id AND deleted_at IS NULL;
  
  IF v_branch_id IS NULL THEN
    RAISE EXCEPTION 'Delivery not found or already deleted';
  END IF;
  
  -- Soft delete delivery
  UPDATE deliveries 
  SET deleted_at = NOW(),
      deleted_by = auth.uid(),
      deletion_reason = p_deletion_reason
  WHERE id = p_delivery_id;
  
  -- Soft delete related payments
  UPDATE payments
  SET deleted_at = NOW(),
      deleted_by = auth.uid(),
      deletion_reason = p_deletion_reason
  WHERE delivery_id = p_delivery_id AND deleted_at IS NULL;
  
  -- Recalculate balance
  PERFORM recalculate_branch_balance(v_branch_id);
  
  -- Log audit
  PERFORM log_audit('DELETE', 'deliveries', p_delivery_id, v_old_data, p_deletion_reason);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RECORD MANUAL PAYMENT ATOMIC
-- ============================================
CREATE OR REPLACE FUNCTION record_manual_payment_atomic(
  p_branch_id UUID,
  p_amount NUMERIC(12,2),
  p_payment_type TEXT,
  p_date DATE
) RETURNS UUID AS $$
DECLARE
  v_payment_id UUID;
BEGIN
  INSERT INTO payments (branch_id, user_id, delivery_id, amount, payment_type, date)
  VALUES (p_branch_id, auth.uid(), NULL, p_amount, p_payment_type, p_date)
  RETURNING id INTO v_payment_id;
  
  -- Recalculate balance
  PERFORM recalculate_branch_balance(p_branch_id);
  
  -- Log audit
  PERFORM log_audit('INSERT', 'payments', v_payment_id, NULL);
  
  RETURN v_payment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- GET BRANCH BALANCE (for staff who can't access current_balance)
-- ============================================
CREATE OR REPLACE FUNCTION get_branch_balance(
  p_branch_id UUID
) RETURNS NUMERIC(12,2) AS $$
BEGIN
  RETURN (
    SELECT current_balance
    FROM branches
    WHERE id = p_branch_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Phase 3: Idempotency for financial mutations
-- Prevents duplicate deliveries from network retries / repeated taps

-- ============================================
-- ADD IDEMPOTENCY KEY TO DELIVERIES
-- ============================================
ALTER TABLE deliveries ADD COLUMN idempotency_key TEXT UNIQUE;

CREATE INDEX idx_deliveries_idempotency
  ON deliveries(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ============================================
-- UPDATE create_delivery_atomic WITH IDEMPOTENCY GUARD
-- ============================================
CREATE OR REPLACE FUNCTION create_delivery_atomic(
  p_branch_id UUID,
  p_items JSONB,  -- [{product_id, delivered_quantity, returned_quantity}]
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
BEGIN
  -- Idempotency guard: return existing delivery if this key was already used
  SELECT id INTO v_delivery_id
  FROM deliveries
  WHERE idempotency_key = p_idempotency_key;

  IF v_delivery_id IS NOT NULL THEN
    RETURN v_delivery_id;
  END IF;

  -- Create delivery header (total will be updated after items)
  INSERT INTO deliveries (branch_id, user_id, total_sales_amount, date, idempotency_key)
  VALUES (p_branch_id, auth.uid(), 0, p_date, p_idempotency_key)
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

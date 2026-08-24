-- ============================================
-- BRANCH HUB TABS (PR-6.2)
-- ============================================

-- 1. List ALL active global products with per-branch activation status.
--    Used by Ürünler & Fiyatlar tab so it can render both active products
--    (with current price + pen icon) and inactive ones ("+ Aktifleştir"
--    button). The staff workflow's listBranchProducts (postgrest) still
--    filters active only — this RPC is admin-only.
CREATE OR REPLACE FUNCTION list_branch_products_with_status(p_branch_id UUID)
RETURNS JSONB AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_branch_id IS NULL THEN RAISE EXCEPTION 'branch_id is required'; END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(row_data ORDER BY row_data->>'productName')
    FROM (
      SELECT
        jsonb_build_object(
          'productId',              p.id,
          'productName',            p.name,
          'productImageUrl',        p.image_url,
          'isActive',               p.is_active,
          'branchProductId',        bp.id,
          'isActivatedForBranch',   bp.id IS NOT NULL AND bp.is_active = TRUE,
          'currentPrice', (
            SELECT price FROM branch_product_prices
            WHERE branch_product_id = bp.id
              AND start_date <= CURRENT_DATE
              AND (end_date IS NULL OR end_date >= CURRENT_DATE)
            LIMIT 1
          )
        ) AS row_data
      FROM products p
      LEFT JOIN branch_products bp
        ON bp.product_id = p.id AND bp.branch_id = p_branch_id
      WHERE p.is_active = TRUE
    ) sub
  ), '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog;

-- 2. SCD2 in-place price edit. Closes the current open period (sets
--    end_date = effective_from - 1 day) and opens a new one in the same
--    transaction. The EXCLUDE constraint enforces no-overlap; last-write-wins
--    on race conditions per locked decision.
CREATE OR REPLACE FUNCTION set_branch_product_price_atomic(
  p_branch_product_id UUID,
  p_new_price NUMERIC(12,2),
  p_effective_from DATE
) RETURNS VOID AS $$
DECLARE v_old JSONB;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_branch_product_id IS NULL THEN RAISE EXCEPTION 'branch_product_id is required'; END IF;
  IF p_new_price <= 0 THEN RAISE EXCEPTION 'Price must be greater than zero'; END IF;
  IF p_effective_from < CURRENT_DATE THEN RAISE EXCEPTION 'effective_from must be today or later'; END IF;
  IF NOT EXISTS (SELECT 1 FROM branch_products WHERE id = p_branch_product_id) THEN
    RAISE EXCEPTION 'Branch product not found';
  END IF;

  SELECT row_to_json(bpp) INTO v_old
  FROM branch_product_prices bpp
  WHERE bpp.branch_product_id = p_branch_product_id AND bpp.end_date IS NULL;

  UPDATE branch_product_prices
  SET end_date = (p_effective_from - INTERVAL '1 day')::DATE
  WHERE branch_product_id = p_branch_product_id AND end_date IS NULL;

  INSERT INTO branch_product_prices (branch_product_id, price, start_date)
  VALUES (p_branch_product_id, p_new_price, p_effective_from);

  PERFORM log_audit('UPDATE', 'branch_product_prices', p_branch_product_id, v_old);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog;

-- 3. Toggle a product's activation for this branch (deactivation + re-activation).
--    Per roadmap: products referenced by receipts cannot be hard-deleted; this
--    is the soft-delete path for the per-branch relationship.
CREATE OR REPLACE FUNCTION set_branch_product_active(
  p_branch_product_id UUID,
  p_is_active BOOLEAN
) RETURNS VOID AS $$
DECLARE v_old JSONB;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT row_to_json(bp) INTO v_old FROM branch_products bp WHERE id = p_branch_product_id;
  IF v_old IS NULL THEN RAISE EXCEPTION 'Branch product not found'; END IF;
  UPDATE branch_products SET is_active = p_is_active WHERE id = p_branch_product_id;
  PERFORM log_audit('UPDATE', 'branch_products', p_branch_product_id, v_old);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog;

-- 4. First activation. Creates the branch_products row + first price period
--    atomically. Rejects if the product is already activated for this branch;
--    the UI checks first but the RPC defends against double-clicks.
CREATE OR REPLACE FUNCTION activate_branch_product(
  p_branch_id UUID,
  p_product_id UUID,
  p_new_price NUMERIC(12,2),
  p_effective_from DATE
) RETURNS UUID AS $$
DECLARE v_bp_id UUID;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_branch_id IS NULL THEN RAISE EXCEPTION 'branch_id is required'; END IF;
  IF p_product_id IS NULL THEN RAISE EXCEPTION 'product_id is required'; END IF;
  IF p_new_price <= 0 THEN RAISE EXCEPTION 'Price must be greater than zero'; END IF;
  IF p_effective_from < CURRENT_DATE THEN RAISE EXCEPTION 'effective_from must be today or later'; END IF;

  IF EXISTS (SELECT 1 FROM branch_products WHERE branch_id = p_branch_id AND product_id = p_product_id) THEN
    RAISE EXCEPTION 'Product already activated for this branch';
  END IF;

  INSERT INTO branch_products (branch_id, product_id, is_active)
  VALUES (p_branch_id, p_product_id, TRUE)
  RETURNING id INTO v_bp_id;

  INSERT INTO branch_product_prices (branch_product_id, price, start_date)
  VALUES (v_bp_id, p_new_price, p_effective_from);

  PERFORM log_audit('INSERT', 'branch_products', v_bp_id, NULL);
  RETURN v_bp_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog;

-- ============================================
-- Extend get_branch_hub_details with auditCount for Detaylar tab
-- ============================================
CREATE OR REPLACE FUNCTION get_branch_hub_details(p_branch_id UUID)
RETURNS JSONB AS $$
DECLARE v_result JSONB;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_branch_id IS NULL THEN RAISE EXCEPTION 'branch_id is required'; END IF;

  SELECT jsonb_build_object(
    'name', b.name,
    'districtName', d.name,
    'cityName', c.name,
    'openingBalance', b.opening_balance,
    'branchCreatedAt', b.created_at,
    'isActive', b.is_active,
    'activeProductCount', (
      SELECT COUNT(DISTINCT bp.product_id)
      FROM branch_products bp
      JOIN products p ON p.id = bp.product_id
      WHERE bp.branch_id = b.id
        AND bp.is_active = TRUE
        AND p.is_active = TRUE
    ),
    'totalProductCount', (SELECT COUNT(*) FROM products WHERE is_active = TRUE),
    'lastMovementDate', GREATEST(
      COALESCE((SELECT MAX(date) FROM deliveries WHERE branch_id = b.id AND deleted_at IS NULL), '1900-01-01'::DATE),
      COALESCE((SELECT MAX(date) FROM payments   WHERE branch_id = b.id AND deleted_at IS NULL), '1900-01-01'::DATE)
    ),
    'auditCount', (
      SELECT COUNT(*) FROM audit_logs WHERE record_id = b.id
    )
  ) INTO v_result
  FROM branches b
  JOIN districts d ON d.id = b.district_id
  JOIN cities    c ON c.id = d.city_id
  WHERE b.id = p_branch_id;

  IF v_result IS NULL THEN RAISE EXCEPTION 'Branch not found'; END IF;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog;

-- ============================================
-- Grants
-- ============================================
GRANT EXECUTE ON FUNCTION list_branch_products_with_status(UUID)                  TO authenticated;
GRANT EXECUTE ON FUNCTION set_branch_product_price_atomic(UUID, NUMERIC, DATE)   TO authenticated;
GRANT EXECUTE ON FUNCTION set_branch_product_active(UUID, BOOLEAN)                TO authenticated;
GRANT EXECUTE ON FUNCTION activate_branch_product(UUID, UUID, NUMERIC, DATE)     TO authenticated;
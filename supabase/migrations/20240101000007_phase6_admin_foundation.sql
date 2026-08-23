-- Phase 6: Admin foundation (PR-6.0)
-- Adds geography soft-delete, app_config singleton, and admin RPCs for
-- reports, branch hub, and CRUD/soft-delete of cities, districts, branches.

-- ============================================
-- Geography soft-delete support
-- ============================================
ALTER TABLE cities    ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE districts ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX idx_cities_active    ON cities(is_active);
CREATE INDEX idx_districts_active ON districts(is_active);

-- ============================================
-- Single-row app config
-- UUID PK so audit_logs.record_id (UUID) can reference it
-- ============================================
CREATE TABLE app_config (
  id                       UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001'::UUID,
  opening_balances_locked  BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX app_config_singleton ON app_config((TRUE));

INSERT INTO app_config (opening_balances_locked) VALUES (FALSE)
ON CONFLICT DO NOTHING;

-- updated_at trigger (reuses existing function from migration 02)
CREATE TRIGGER app_config_updated_at BEFORE UPDATE ON app_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: no policies = deny all direct client access; only SECURITY DEFINER RPCs touch this table
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Internal helper: range → (start, end, granularity)
-- STABLE (not IMMUTABLE — uses NOW() and reads deliveries)
-- ============================================
CREATE OR REPLACE FUNCTION _summary_range(p_range TEXT)
RETURNS TABLE(start_date DATE, end_date DATE, granularity TEXT) AS $$
DECLARE
  v_today DATE := (NOW() AT TIME ZONE 'Europe/Istanbul')::DATE;
  v_min_date DATE;
  v_span_days INT;
BEGIN
  IF p_range = 'week' THEN
    start_date := date_trunc('week', v_today)::DATE;
    end_date := v_today;
    granularity := 'day';
    RETURN NEXT;
  ELSIF p_range = 'month' THEN
    start_date := date_trunc('month', v_today)::DATE;
    end_date := v_today;
    granularity := 'day';
    RETURN NEXT;
  ELSIF p_range = 'all' THEN
    SELECT COALESCE(MIN(date), v_today) INTO v_min_date
    FROM deliveries WHERE deleted_at IS NULL;
    start_date := v_min_date;
    end_date := v_today;
    v_span_days := v_today - v_min_date;
    granularity := CASE
      WHEN v_span_days <= 90  THEN 'day'
      WHEN v_span_days <= 730 THEN 'week'
      ELSE 'month'
    END;
    RETURN NEXT;
  ELSE
    RAISE EXCEPTION 'Invalid range: %', p_range;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE SET search_path = '';

-- ============================================
-- Geography create + soft-delete
-- ============================================

CREATE OR REPLACE FUNCTION create_city(p_name TEXT)
RETURNS UUID AS $$
DECLARE v_id UUID;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF TRIM(p_name) = '' THEN RAISE EXCEPTION 'Name cannot be empty'; END IF;

  INSERT INTO cities (name, is_active) VALUES (TRIM(p_name), TRUE)
  RETURNING id INTO v_id;

  PERFORM log_audit('INSERT', 'cities', v_id, NULL);
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION create_district(p_city_id UUID, p_name TEXT)
RETURNS UUID AS $$
DECLARE v_id UUID;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_city_id IS NULL THEN RAISE EXCEPTION 'city_id is required'; END IF;
  IF TRIM(p_name) = '' THEN RAISE EXCEPTION 'Name cannot be empty'; END IF;
  IF NOT EXISTS (SELECT 1 FROM cities WHERE id = p_city_id) THEN
    RAISE EXCEPTION 'City not found';
  END IF;

  INSERT INTO districts (city_id, name, is_active) VALUES (p_city_id, TRIM(p_name), TRUE)
  RETURNING id INTO v_id;

  PERFORM log_audit('INSERT', 'districts', v_id, NULL);
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION create_branch(
  p_district_id UUID,
  p_name TEXT,
  p_opening_balance NUMERIC(12,2),
  p_is_active BOOLEAN
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
  v_locked BOOLEAN;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_district_id IS NULL THEN RAISE EXCEPTION 'district_id is required'; END IF;
  IF TRIM(p_name) = '' THEN RAISE EXCEPTION 'Name cannot be empty'; END IF;
  IF p_opening_balance < 0 THEN RAISE EXCEPTION 'Opening balance cannot be negative'; END IF;

  -- Existence check before lock check: a missing district_id is a structural error
  -- and should not be masked by the (more easily-fixed) lock-state error.
  IF NOT EXISTS (SELECT 1 FROM districts WHERE id = p_district_id) THEN
    RAISE EXCEPTION 'District not found';
  END IF;

  SELECT opening_balances_locked INTO v_locked
  FROM app_config WHERE id = '00000000-0000-0000-0000-000000000001'::UUID;
  IF v_locked AND p_opening_balance <> 0 THEN
    RAISE EXCEPTION 'Opening balances are locked; new branches must start at 0';
  END IF;

  INSERT INTO branches (district_id, name, current_balance, opening_balance, is_active)
  VALUES (p_district_id, TRIM(p_name), p_opening_balance, p_opening_balance, p_is_active)
  RETURNING id INTO v_id;

  PERFORM log_audit('INSERT', 'branches', v_id, NULL);
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION set_city_active(p_city_id UUID, p_is_active BOOLEAN)
RETURNS VOID AS $$
DECLARE v_old JSONB;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT row_to_json(c) INTO v_old FROM cities c WHERE id = p_city_id;
  IF v_old IS NULL THEN RAISE EXCEPTION 'City not found'; END IF;
  UPDATE cities SET is_active = p_is_active WHERE id = p_city_id;
  PERFORM log_audit('UPDATE', 'cities', p_city_id, v_old);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION set_district_active(p_district_id UUID, p_is_active BOOLEAN)
RETURNS VOID AS $$
DECLARE v_old JSONB;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT row_to_json(d) INTO v_old FROM districts d WHERE id = p_district_id;
  IF v_old IS NULL THEN RAISE EXCEPTION 'District not found'; END IF;
  UPDATE districts SET is_active = p_is_active WHERE id = p_district_id;
  PERFORM log_audit('UPDATE', 'districts', p_district_id, v_old);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION set_branch_active(p_branch_id UUID, p_is_active BOOLEAN)
RETURNS VOID AS $$
DECLARE v_old JSONB;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT row_to_json(b) INTO v_old FROM branches b WHERE id = p_branch_id;
  IF v_old IS NULL THEN RAISE EXCEPTION 'Branch not found'; END IF;
  UPDATE branches SET is_active = p_is_active WHERE id = p_branch_id;
  PERFORM log_audit('UPDATE', 'branches', p_branch_id, v_old);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION set_opening_balances_locked(p_locked BOOLEAN)
RETURNS VOID AS $$
DECLARE
  v_old JSONB;
  v_config_id UUID := '00000000-0000-0000-0000-000000000001'::UUID;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT row_to_json(ac) INTO v_old FROM app_config ac WHERE id = v_config_id;
  IF v_old IS NULL THEN RAISE EXCEPTION 'app_config row missing'; END IF;
  UPDATE app_config SET opening_balances_locked = p_locked WHERE id = v_config_id;
  PERFORM log_audit('UPDATE', 'app_config', v_config_id, v_old);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- ============================================
-- Geography list queries (with counts)
-- Ordered active-first, then by name
-- ============================================

CREATE OR REPLACE FUNCTION list_cities_with_counts()
RETURNS JSONB AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN (
    SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb)
    FROM (
      SELECT
        jsonb_build_object(
          'id', c.id,
          'name', c.name,
          'isActive', c.is_active,
          'districtCount', (SELECT COUNT(*) FROM districts d WHERE d.city_id = c.id),
          'branchCount', (
            SELECT COUNT(*) FROM branches b
            JOIN districts d ON d.id = b.district_id
            WHERE d.city_id = c.id
          )
        ) AS row_data
      FROM cities c
      ORDER BY c.is_active DESC, c.name ASC
    ) sub
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION list_districts_with_counts(p_city_id UUID)
RETURNS JSONB AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_city_id IS NULL THEN RAISE EXCEPTION 'city_id is required'; END IF;
  RETURN (
    SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb)
    FROM (
      SELECT
        jsonb_build_object(
          'id', d.id,
          'cityId', d.city_id,
          'name', d.name,
          'isActive', d.is_active,
          'branchCount', (SELECT COUNT(*) FROM branches b WHERE b.district_id = d.id),
          'activeBranchCount', (
            SELECT COUNT(*) FROM branches b
            WHERE b.district_id = d.id AND b.is_active = TRUE
          )
        ) AS row_data
      FROM districts d
      WHERE d.city_id = p_city_id
      ORDER BY d.is_active DESC, d.name ASC
    ) sub
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION list_branches_with_context(p_district_id UUID)
RETURNS JSONB AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_district_id IS NULL THEN RAISE EXCEPTION 'district_id is required'; END IF;
  RETURN (
    SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb)
    FROM (
      SELECT
        jsonb_build_object(
          'id', b.id,
          'districtId', b.district_id,
          'name', b.name,
          'currentBalance', b.current_balance,
          'openingBalance', b.opening_balance,
          'isActive', b.is_active,
          'activeProductCount', (
            SELECT COUNT(DISTINCT bp.product_id)
            FROM branch_products bp
            JOIN products p ON p.id = bp.product_id
            WHERE bp.branch_id = b.id
              AND bp.is_active = TRUE
              AND p.is_active = TRUE
          )
        ) AS row_data
      FROM branches b
      WHERE b.district_id = p_district_id
      ORDER BY b.is_active DESC, b.name ASC
    ) sub
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION get_opening_balances_locked()
RETURNS BOOLEAN AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN (
    SELECT opening_balances_locked
    FROM app_config
    WHERE id = '00000000-0000-0000-0000-000000000001'::UUID
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION get_branch_hub_details(p_branch_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
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
    'totalProductCount', (
      SELECT COUNT(*) FROM products WHERE is_active = TRUE
    ),
    'lastMovementDate', GREATEST(
      (SELECT MAX(date) FROM deliveries WHERE branch_id = b.id AND deleted_at IS NULL),
      (SELECT MAX(date) FROM payments   WHERE branch_id = b.id AND deleted_at IS NULL)
    )
    -- Both MAXs return NULL when there are no rows; GREATEST(NULL, NULL) is NULL;
    -- JSONB emits null so the UI gets a real "no movement" signal instead of 1900-01-01.
  ) INTO v_result
  FROM branches b
  JOIN districts d ON d.id = b.district_id
  JOIN cities    c ON c.id = d.city_id
  WHERE b.id = p_branch_id;

  IF v_result IS NULL THEN RAISE EXCEPTION 'Branch not found'; END IF;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- ============================================
-- Reports (Özet)
-- ============================================

CREATE OR REPLACE FUNCTION report_kpis(p_range TEXT)
RETURNS JSONB AS $$
DECLARE
  v_start DATE; v_end DATE; v_granularity TEXT;
  v_total_sales NUMERIC(12,2) := 0;
  v_total_collection NUMERIC(12,2) := 0;
  v_active_branches INT := 0;
  v_active_products INT := 0;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT start_date, end_date, granularity
    INTO v_start, v_end, v_granularity
    FROM _summary_range(p_range);

  SELECT COALESCE(SUM(total_sales_amount), 0) INTO v_total_sales
  FROM deliveries
  WHERE deleted_at IS NULL AND date BETWEEN v_start AND v_end;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_collection
  FROM payments
  WHERE deleted_at IS NULL AND date BETWEEN v_start AND v_end;

  SELECT COUNT(*) INTO v_active_branches FROM branches WHERE is_active = TRUE;

  SELECT COUNT(DISTINCT p.id) INTO v_active_products
  FROM products p
  WHERE p.is_active = TRUE
    AND EXISTS (
      SELECT 1 FROM branch_products bp
      JOIN branches b ON b.id = bp.branch_id
      WHERE bp.product_id = p.id
        AND bp.is_active = TRUE
        AND b.is_active = TRUE
    );

  RETURN jsonb_build_object(
    'totalSales', v_total_sales,
    'totalCollection', v_total_collection,
    'activeBranchCount', v_active_branches,
    'activeProductCount', v_active_products
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION report_product_distribution(p_range TEXT, p_limit INT DEFAULT 100)
RETURNS JSONB AS $$
DECLARE v_start DATE; v_end DATE; v_granularity TEXT;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT start_date, end_date, granularity
    INTO v_start, v_end, v_granularity
    FROM _summary_range(p_range);

  RETURN (
    SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb)
    FROM (
      SELECT
        p.id::text AS id,
        p.name AS label,
        COALESCE(SUM(di.net_quantity * di.unit_price), 0)::NUMERIC(12,2) AS value,
        FALSE AS isMerged
      FROM products p
      JOIN delivery_items di ON di.product_id = p.id
      JOIN deliveries d ON d.id = di.delivery_id
      WHERE d.deleted_at IS NULL
        AND d.date BETWEEN v_start AND v_end
        AND p.is_active = TRUE
      GROUP BY p.id, p.name
      ORDER BY SUM(di.net_quantity * di.unit_price) DESC
      LIMIT p_limit
    ) row_data
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Branch distribution: include both active and inactive branches with sales in the range.
-- Filters only `d.deleted_at IS NULL` + date range; current is_active is irrelevant to "sales this month".
CREATE OR REPLACE FUNCTION report_branch_distribution(p_range TEXT, p_limit INT DEFAULT 100)
RETURNS JSONB AS $$
DECLARE v_start DATE; v_end DATE; v_granularity TEXT;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT start_date, end_date, granularity
    INTO v_start, v_end, v_granularity
    FROM _summary_range(p_range);

  RETURN (
    SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb)
    FROM (
      SELECT
        b.id::text AS id,
        b.name AS label,
        COALESCE(SUM(di.net_quantity * di.unit_price), 0)::NUMERIC(12,2) AS value,
        FALSE AS isMerged
      FROM branches b
      JOIN deliveries d ON d.branch_id = b.id
      JOIN delivery_items di ON di.delivery_id = d.id
      WHERE d.deleted_at IS NULL
        AND d.date BETWEEN v_start AND v_end
      GROUP BY b.id, b.name
      ORDER BY SUM(di.net_quantity * di.unit_price) DESC
      LIMIT p_limit
    ) row_data
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION report_daily_series(p_range TEXT)
RETURNS JSONB AS $$
DECLARE
  v_start DATE; v_end DATE; v_granularity TEXT;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT start_date, end_date, granularity
    INTO v_start, v_end, v_granularity
    FROM _summary_range(p_range);

  RETURN jsonb_build_object(
    'granularity', v_granularity,
    'points', COALESCE((
      SELECT jsonb_agg(row_data ORDER BY bucket)
      FROM (
        SELECT
          to_char(date_trunc(v_granularity, date), 'YYYY-MM-DD') AS bucket,
          COALESCE(SUM(total_sales_amount), 0)::NUMERIC(12,2) AS sales
        FROM deliveries
        WHERE deleted_at IS NULL
          AND date BETWEEN v_start AND v_end
        GROUP BY date_trunc(v_granularity, date)
      ) row_data
    ), '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- ============================================
-- Branch movements (Hareketler tab, PR-6.2 stub consumer)
-- ============================================

CREATE OR REPLACE FUNCTION list_branch_movements(
  p_branch_id UUID,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
) RETURNS JSONB AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_branch_id IS NULL THEN RAISE EXCEPTION 'branch_id is required'; END IF;

  RETURN jsonb_build_object(
    'deliveries', COALESCE((
      SELECT jsonb_agg(row_data ORDER BY bucket_date DESC, created_at DESC)
      FROM (
        SELECT
          jsonb_build_object(
            'id', id::text,
            'type', 'delivery'::TEXT,
            'date', date,
            'amount', total_sales_amount,
            'paymentType', NULL::TEXT,
            'isDeleted', deleted_at IS NOT NULL,
            'createdAt', created_at
          ) AS row_data,
          date AS bucket_date,
          created_at
        FROM deliveries
        WHERE branch_id = p_branch_id
        LIMIT p_limit OFFSET p_offset
      ) sub
    ), '[]'::jsonb),
    'payments', COALESCE((
      SELECT jsonb_agg(row_data ORDER BY bucket_date DESC, created_at DESC)
      FROM (
        SELECT
          jsonb_build_object(
            'id', id::text,
            'type', 'payment'::TEXT,
            'date', date,
            'amount', amount,
            'paymentType', payment_type,
            'isDeleted', deleted_at IS NOT NULL,
            'createdAt', created_at
          ) AS row_data,
          date AS bucket_date,
          created_at
        FROM payments
        WHERE branch_id = p_branch_id
        LIMIT p_limit OFFSET p_offset
      ) sub
    ), '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- ============================================
-- Grants
-- ============================================

GRANT EXECUTE ON FUNCTION create_city(TEXT)                              TO authenticated;
GRANT EXECUTE ON FUNCTION create_district(UUID, TEXT)                    TO authenticated;
GRANT EXECUTE ON FUNCTION create_branch(UUID, TEXT, NUMERIC, BOOLEAN)    TO authenticated;
GRANT EXECUTE ON FUNCTION set_city_active(UUID, BOOLEAN)                 TO authenticated;
GRANT EXECUTE ON FUNCTION set_district_active(UUID, BOOLEAN)             TO authenticated;
GRANT EXECUTE ON FUNCTION set_branch_active(UUID, BOOLEAN)               TO authenticated;
GRANT EXECUTE ON FUNCTION set_opening_balances_locked(BOOLEAN)           TO authenticated;
GRANT EXECUTE ON FUNCTION list_cities_with_counts()                      TO authenticated;
GRANT EXECUTE ON FUNCTION list_districts_with_counts(UUID)               TO authenticated;
GRANT EXECUTE ON FUNCTION list_branches_with_context(UUID)               TO authenticated;
GRANT EXECUTE ON FUNCTION get_opening_balances_locked()                  TO authenticated;
GRANT EXECUTE ON FUNCTION get_branch_hub_details(UUID)                   TO authenticated;
GRANT EXECUTE ON FUNCTION report_kpis(TEXT)                              TO authenticated;
GRANT EXECUTE ON FUNCTION report_product_distribution(TEXT, INT)         TO authenticated;
GRANT EXECUTE ON FUNCTION report_branch_distribution(TEXT, INT)          TO authenticated;
GRANT EXECUTE ON FUNCTION report_daily_series(TEXT)                      TO authenticated;
GRANT EXECUTE ON FUNCTION list_branch_movements(UUID, INT, INT)          TO authenticated;
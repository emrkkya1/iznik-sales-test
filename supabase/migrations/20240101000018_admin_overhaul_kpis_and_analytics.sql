-- ============================================
-- M18: ADMIN OVERHAUL — KPI EXTENSIONS & ANALYTICS
-- ============================================
--
-- Extends the report / hub RPCs with new metrics for the redesigned admin:
--   * report_kpis          — adds delivered_qty, returned_qty, return_rate
--   * report_branch_income — new: per-branch sales for the "Gelir dağılımı" pie
--   * report_branch_return_rate — new: per-branch return rate for "İade oranı" pie
--   * get_branch_hub_details — adds delivered_qty, returned_qty, return_rate for Branch Hub cards
--   * list_branches_analytics — new: flat /branches list with search + status + date range
--                               + day-of-week mask + sortable + paginated
--
-- Conventions:
--   * delivered_qty   = SUM(delivery_items.delivered_quantity)
--   * returned_qty    = SUM(delivery_items.returned_quantity)
--   * return_rate     = returned_qty / NULLIF(delivered_qty, 0) * 100 (NULL when no deliveries)
--   * day-of-week     = EXTRACT(DOW FROM d.date) — 0=Sunday..6=Saturday, matches JS Date.getDay()
--   * p_range         = 'week' | 'month' | 'all' — same semantics as existing _summary_range

-- --------------------------------------------
-- 1) report_kpis — add delivered / returned / return_rate
-- --------------------------------------------
CREATE OR REPLACE FUNCTION report_kpis(p_range TEXT)
RETURNS JSONB AS $$
DECLARE
  v_start DATE; v_end DATE; v_granularity TEXT;
  v_total_sales NUMERIC(12,2) := 0;
  v_total_collection NUMERIC(12,2) := 0;
  v_delivered_qty NUMERIC(12,2) := 0;
  v_returned_qty NUMERIC(12,2) := 0;
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

  SELECT
      COALESCE(SUM(di.delivered_quantity), 0),
      COALESCE(SUM(di.returned_quantity), 0)
    INTO v_delivered_qty, v_returned_qty
  FROM delivery_items di
  JOIN deliveries d ON d.id = di.delivery_id
  WHERE d.deleted_at IS NULL
    AND d.date BETWEEN v_start AND v_end;

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
    'deliveredQty', v_delivered_qty,
    'returnedQty', v_returned_qty,
    'returnRate', CASE
      WHEN v_delivered_qty = 0 THEN NULL
      ELSE ROUND((v_returned_qty / v_delivered_qty * 100)::NUMERIC, 2)
    END,
    'activeBranchCount', v_active_branches,
    'activeProductCount', v_active_products
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

ALTER FUNCTION public.report_kpis(text) SET search_path = public, pg_catalog;

-- --------------------------------------------
-- 2) report_branch_income — per-branch sales
-- --------------------------------------------
-- Returns top branches by total_sales in the given range.
-- Includes both active and inactive branches (mirrors report_branch_distribution).
CREATE OR REPLACE FUNCTION report_branch_income(
  p_range TEXT,
  p_limit INT DEFAULT 100
)
RETURNS JSONB AS $$
DECLARE v_start DATE; v_end DATE; v_granularity TEXT;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_limit IS NULL OR p_limit <= 0 THEN p_limit := 100; END IF;
  SELECT start_date, end_date, granularity
    INTO v_start, v_end, v_granularity
    FROM _summary_range(p_range);

  RETURN (
    SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb)
    FROM (
      SELECT
        b.id::text        AS id,
        b.name            AS label,
        COALESCE(SUM(d.total_sales_amount), 0)::NUMERIC(12,2) AS value,
        FALSE             AS isMerged
      FROM branches b
      JOIN deliveries d ON d.branch_id = b.id
      WHERE d.deleted_at IS NULL
        AND d.date BETWEEN v_start AND v_end
      GROUP BY b.id, b.name
      ORDER BY SUM(d.total_sales_amount) DESC
      LIMIT p_limit
    ) row_data
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

ALTER FUNCTION public.report_branch_income(text, integer) SET search_path = public, pg_catalog;

-- --------------------------------------------
-- 3) report_branch_return_rate — per-branch return rate
-- --------------------------------------------
-- Branches with zero deliveries are omitted (no rate to report).
CREATE OR REPLACE FUNCTION report_branch_return_rate(
  p_range TEXT,
  p_limit INT DEFAULT 100
)
RETURNS JSONB AS $$
DECLARE v_start DATE; v_end DATE; v_granularity TEXT;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_limit IS NULL OR p_limit <= 0 THEN p_limit := 100; END IF;
  SELECT start_date, end_date, granularity
    INTO v_start, v_end, v_granularity
    FROM _summary_range(p_range);

  RETURN (
    SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb)
    FROM (
      SELECT
        b.id::text        AS id,
        b.name            AS label,
        CASE
          WHEN SUM(di.delivered_quantity) = 0 THEN 0
          ELSE ROUND((SUM(di.returned_quantity) / SUM(di.delivered_quantity) * 100)::NUMERIC, 2)
        END AS value,
        FALSE             AS isMerged
      FROM branches b
      JOIN deliveries d ON d.branch_id = b.id
      JOIN delivery_items di ON di.delivery_id = d.id
      WHERE d.deleted_at IS NULL
        AND d.date BETWEEN v_start AND v_end
      GROUP BY b.id, b.name
      HAVING SUM(di.delivered_quantity) > 0
      ORDER BY
        CASE
          WHEN SUM(di.delivered_quantity) = 0 THEN 0
          ELSE (SUM(di.returned_quantity) / SUM(di.delivered_quantity))
        END DESC
      LIMIT p_limit
    ) row_data
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

ALTER FUNCTION public.report_branch_return_rate(text, integer) SET search_path = public, pg_catalog;

-- --------------------------------------------
-- 4) get_branch_hub_details — add delivered / returned / return_rate
-- --------------------------------------------
CREATE OR REPLACE FUNCTION get_branch_hub_details(p_branch_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_delivered NUMERIC(12,2) := 0;
  v_returned NUMERIC(12,2) := 0;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_branch_id IS NULL THEN RAISE EXCEPTION 'branch_id is required'; END IF;

  -- Aggregate the branch's all-time delivered / returned (informational;
  -- the Branch Hub already exposes current balance separately via
  -- get_branch_balance, so we don't slice by date here).
  SELECT
      COALESCE(SUM(di.delivered_quantity), 0),
      COALESCE(SUM(di.returned_quantity), 0)
    INTO v_delivered, v_returned
  FROM delivery_items di
  JOIN deliveries d ON d.id = di.delivery_id
  WHERE d.branch_id = p_branch_id
    AND d.deleted_at IS NULL;

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
    ),
    'auditCount', (
      SELECT COUNT(*) FROM audit_logs WHERE record_id = b.id
    ),
    'deliveredQty', v_delivered,
    'returnedQty',  v_returned,
    'returnRate',   CASE
      WHEN v_delivered = 0 THEN NULL
      ELSE ROUND((v_returned / v_delivered * 100)::NUMERIC, 2)
    END
  ) INTO v_result
  FROM branches b
  JOIN districts d ON d.id = b.district_id
  JOIN cities    c ON c.id = d.city_id
  WHERE b.id = p_branch_id;

  IF v_result IS NULL THEN RAISE EXCEPTION 'Branch not found'; END IF;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

ALTER FUNCTION public.get_branch_hub_details(uuid) SET search_path = public, pg_catalog;

-- --------------------------------------------
-- 5) list_branches_analytics — flat branches table for /branches
-- --------------------------------------------
-- Filters:
--   * p_search       — ILIKE on branch name (optional)
--   * p_status       — 'all' | 'active' | 'inactive'
--   * p_date_from    — start date for metrics (inclusive, optional)
--   * p_date_to      — end date for metrics (inclusive, optional)
--   * p_days_of_week — array of 0..6 (0=Sunday..6=Saturday) — restrict to those weekdays
-- Sort:
--   * p_sort_by      — 'name' | 'balance' | 'return_rate' | 'last_activity'
--   * p_sort_dir     — 'asc' | 'desc'
-- Pagination:
--   * p_limit, p_offset
--
-- Returns (rows, total_count) — total_count is the unpaginated row count
-- after filters (useful for "showing X of Y" headers).
CREATE OR REPLACE FUNCTION list_branches_analytics(
  p_search       TEXT         DEFAULT NULL,
  p_status       TEXT         DEFAULT 'all',
  p_date_from    DATE         DEFAULT NULL,
  p_date_to      DATE         DEFAULT NULL,
  p_days_of_week SMALLINT[]   DEFAULT NULL,
  p_sort_by      TEXT         DEFAULT 'name',
  p_sort_dir     TEXT         DEFAULT 'asc',
  p_limit        INT          DEFAULT 50,
  p_offset       INT          DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
  v_status_filter TEXT := LOWER(COALESCE(p_status, 'all'));
  v_sort_by TEXT := LOWER(COALESCE(p_sort_by, 'name'));
  v_sort_dir TEXT := LOWER(COALESCE(p_sort_dir, 'asc'));
  v_total INT := 0;
  v_rows JSONB := '[]'::jsonb;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_limit IS NULL OR p_limit <= 0 THEN p_limit := 50; END IF;
  IF p_limit > 200 THEN p_limit := 200; END IF;
  IF p_offset IS NULL OR p_offset < 0 THEN p_offset := 0; END IF;
  IF v_status_filter NOT IN ('all', 'active', 'inactive') THEN
    RAISE EXCEPTION 'Invalid status: %', p_status;
  END IF;

  -- Total count after filters (ignores pagination).
  SELECT COUNT(*)::INT INTO v_total
  FROM branches b
  WHERE (p_search IS NULL OR b.name ILIKE '%' || p_search || '%')
    AND (v_status_filter = 'all'
         OR (v_status_filter = 'active'   AND b.is_active = TRUE)
         OR (v_status_filter = 'inactive' AND b.is_active = FALSE));

  v_rows := COALESCE((
    SELECT jsonb_agg(row_data)
    FROM (
      SELECT
        jsonb_build_object(
          'branchId',         cte.branch_id::text,
          'name',             cte.branch_name,
          'cityName',         cte.city_name,
          'districtName',     cte.district_name,
          'currentBalance',   cte.current_balance,
          'deliveredQty',     cte.delivered_qty,
          'returnedQty',      cte.returned_qty,
          'returnRate',       cte.return_rate,
          'lastActivityDate', cte.last_activity_date,
          'isActive',         cte.is_active
        ) AS row_data
      FROM (
        SELECT
          b.id            AS branch_id,
          b.name          AS branch_name,
          c.name          AS city_name,
          di.name         AS district_name,
          b.current_balance,
          b.is_active,
          b.created_at,
          COALESCE((
            SELECT GREATEST(
              (SELECT MAX(d2.date) FROM deliveries d2
                 WHERE d2.branch_id = b.id AND d2.deleted_at IS NULL
                   AND (p_date_from IS NULL OR d2.date >= p_date_from)
                   AND (p_date_to   IS NULL OR d2.date <= p_date_to)
                   AND (p_days_of_week IS NULL
                        OR EXTRACT(DOW FROM d2.date)::SMALLINT = ANY(p_days_of_week))),
              (SELECT MAX(p2.date) FROM payments p2
                 WHERE p2.branch_id = b.id AND p2.deleted_at IS NULL
                   AND (p_date_from IS NULL OR p2.date >= p_date_from)
                   AND (p_date_to   IS NULL OR p2.date <= p_date_to)
                   AND (p_days_of_week IS NULL
                        OR EXTRACT(DOW FROM p2.date)::SMALLINT = ANY(p_days_of_week)))
            )
          ), b.created_at::DATE) AS last_activity_date,
          COALESCE((
            SELECT SUM(di2.delivered_quantity)
            FROM delivery_items di2
            JOIN deliveries d2 ON d2.id = di2.delivery_id
            WHERE d2.branch_id = b.id
              AND d2.deleted_at IS NULL
              AND (p_date_from IS NULL OR d2.date >= p_date_from)
              AND (p_date_to   IS NULL OR d2.date <= p_date_to)
              AND (p_days_of_week IS NULL
                   OR EXTRACT(DOW FROM d2.date)::SMALLINT = ANY(p_days_of_week))
          ), 0)::NUMERIC(12,2) AS delivered_qty,
          COALESCE((
            SELECT SUM(di2.returned_quantity)
            FROM delivery_items di2
            JOIN deliveries d2 ON d2.id = di2.delivery_id
            WHERE d2.branch_id = b.id
              AND d2.deleted_at IS NULL
              AND (p_date_from IS NULL OR d2.date >= p_date_from)
              AND (p_date_to   IS NULL OR d2.date <= p_date_to)
              AND (p_days_of_week IS NULL
                   OR EXTRACT(DOW FROM d2.date)::SMALLINT = ANY(p_days_of_week))
          ), 0)::NUMERIC(12,2) AS returned_qty,
          CASE
            WHEN COALESCE((
              SELECT SUM(di2.delivered_quantity)
              FROM delivery_items di2
              JOIN deliveries d2 ON d2.id = di2.delivery_id
              WHERE d2.branch_id = b.id
                AND d2.deleted_at IS NULL
                AND (p_date_from IS NULL OR d2.date >= p_date_from)
                AND (p_date_to   IS NULL OR d2.date <= p_date_to)
                AND (p_days_of_week IS NULL
                     OR EXTRACT(DOW FROM d2.date)::SMALLINT = ANY(p_days_of_week))
            ), 0) = 0 THEN NULL
            ELSE ROUND((
              COALESCE((
                SELECT SUM(di2.returned_quantity)
                FROM delivery_items di2
                JOIN deliveries d2 ON d2.id = di2.delivery_id
                WHERE d2.branch_id = b.id
                  AND d2.deleted_at IS NULL
                  AND (p_date_from IS NULL OR d2.date >= p_date_from)
                  AND (p_date_to   IS NULL OR d2.date <= p_date_to)
                  AND (p_days_of_week IS NULL
                       OR EXTRACT(DOW FROM d2.date)::SMALLINT = ANY(p_days_of_week))
              ), 0)
              /
              COALESCE((
                SELECT SUM(di2.delivered_quantity)
                FROM delivery_items di2
                JOIN deliveries d2 ON d2.id = di2.delivery_id
                WHERE d2.branch_id = b.id
                  AND d2.deleted_at IS NULL
                  AND (p_date_from IS NULL OR d2.date >= p_date_from)
                  AND (p_date_to   IS NULL OR d2.date <= p_date_to)
                  AND (p_days_of_week IS NULL
                       OR EXTRACT(DOW FROM d2.date)::SMALLINT = ANY(p_days_of_week))
              ), 0)
              * 100
            )::NUMERIC, 2)
          END AS return_rate
        FROM branches b
        JOIN districts di ON di.id = b.district_id
        JOIN cities    c  ON c.id  = di.city_id
        WHERE (p_search IS NULL OR b.name ILIKE '%' || p_search || '%')
          AND (v_status_filter = 'all'
               OR (v_status_filter = 'active'   AND b.is_active = TRUE)
               OR (v_status_filter = 'inactive' AND b.is_active = FALSE))
      ) cte
      ORDER BY
        CASE WHEN v_sort_by = 'name' AND v_sort_dir = 'asc'  THEN cte.branch_name        END ASC,
        CASE WHEN v_sort_by = 'name' AND v_sort_dir = 'desc' THEN cte.branch_name        END DESC,
        CASE WHEN v_sort_by = 'balance' AND v_sort_dir = 'asc'  THEN cte.current_balance  END ASC,
        CASE WHEN v_sort_by = 'balance' AND v_sort_dir = 'desc' THEN cte.current_balance  END DESC,
        CASE WHEN v_sort_by = 'last_activity' AND v_sort_dir = 'asc'  THEN cte.last_activity_date END ASC NULLS LAST,
        CASE WHEN v_sort_by = 'last_activity' AND v_sort_dir = 'desc' THEN cte.last_activity_date END DESC NULLS LAST,
        CASE WHEN v_sort_by = 'return_rate' AND v_sort_dir = 'asc'
             THEN cte.return_rate END ASC NULLS LAST,
        CASE WHEN v_sort_by = 'return_rate' AND v_sort_dir = 'desc'
             THEN cte.return_rate END DESC NULLS LAST,
        cte.branch_name ASC
      LIMIT p_limit OFFSET p_offset
    ) page
  ), '[]'::jsonb);

  RETURN jsonb_build_object(
    'rows',        v_rows,
    'totalCount',  v_total
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

ALTER FUNCTION public.list_branches_analytics(
  text, text, date, date, smallint[], text, text, integer, integer
) SET search_path = public, pg_catalog;

-- --------------------------------------------
-- GRANTS
-- --------------------------------------------
GRANT EXECUTE ON FUNCTION report_kpis(TEXT)                          TO authenticated;
GRANT EXECUTE ON FUNCTION report_branch_income(TEXT, INT)            TO authenticated;
GRANT EXECUTE ON FUNCTION report_branch_return_rate(TEXT, INT)       TO authenticated;
GRANT EXECUTE ON FUNCTION get_branch_hub_details(UUID)               TO authenticated;
GRANT EXECUTE ON FUNCTION list_branches_analytics(
  text, text, date, date, smallint[], text, text, integer, integer
) TO authenticated;
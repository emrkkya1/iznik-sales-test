# Phase 6A — Foundation + Özet + Şubeler (PR-6.0 + PR-6.1)

Detailed implementation plan for the first two PRs of Phase 6.

- **PR-6.0 — Foundation**: database + service layer + hooks. No UI changes. Ships the entire backend for Özet, Şubeler, Branch Hub shell, and lays the groundwork for PR-6.2 / PR-6.3.
- **PR-6.1 — Özet + Şubeler + Branch Hub shell**: replaces placeholders with real screens; adds drill-down navigation, KPI / distribution / chart cards, geography CRUD sheets, Branch Hub header + summary cards (tabs come in PR-6.2). Also removes Tahsilatlar placeholder route + nav item.

---

## PR-6.0 — Foundation

### Goal

Ship every database object, service contract, and React Query hook the UI needs. No visual changes — placeholder screens still render. App must boot and behave identically after merge. Also install `react-native-gifted-charts` + `react-native-linear-gradient` deps so PR-6.1 can use them.

### 1. Migration: `supabase/migrations/20240101000007_phase6_admin_foundation.sql`

#### Schema changes

```sql
-- Geography soft-delete support
ALTER TABLE cities    ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE districts ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX idx_cities_active    ON cities(is_active);
CREATE INDEX idx_districts_active ON districts(is_active);

-- Single-row app config (uses deterministic UUID so audit_logs.record_id can reference it)
CREATE TABLE app_config (
  id                       UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001'::UUID,
  opening_balances_locked  BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

-- Enforce single row
CREATE UNIQUE INDEX app_config_singleton ON app_config((TRUE));

INSERT INTO app_config (opening_balances_locked) VALUES (FALSE)
ON CONFLICT DO NOTHING;

-- RLS: no policies = deny all direct client access; only SECURITY DEFINER RPCs touch this table
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER app_config_updated_at BEFORE UPDATE ON app_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

#### RPCs

All RPCs start with `IF NOT is_admin() THEN RAISE EXCEPTION 'Not authorized' END IF;` and use `LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''`. The `_summary_range` helper is `STABLE` (NOT `IMMUTABLE` — it calls `NOW()` and reads from `deliveries`).

```sql
-- ============================================
-- Internal helper: range → (start, end, granularity)
-- STABLE because NOW() and DB reads are not deterministic across calls.
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
```

```sql
-- ============================================
-- Geography CRUD + soft-delete
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

  SELECT opening_balances_locked INTO v_locked FROM app_config WHERE id = '00000000-0000-0000-0000-000000000001'::UUID;
  IF v_locked AND p_opening_balance <> 0 THEN
    RAISE EXCEPTION 'Opening balances are locked; new branches must start at 0';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM districts WHERE id = p_district_id) THEN
    RAISE EXCEPTION 'District not found';
  END IF;

  INSERT INTO branches (district_id, name, current_balance, opening_balance, is_active)
  VALUES (p_district_id, TRIM(p_name), p_opening_balance, p_opening_balance, p_is_active)
  RETURNING id INTO v_id;

  PERFORM log_audit('INSERT', 'branches', v_id, NULL);
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Soft-delete: require row exists; capture both old and new state
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
```

```sql
-- ============================================
-- Geography list queries (with counts)
-- Active-first ordering per locked decision
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

-- Branch hub summary (used by /branches/[branchId] shell)
-- lastMovementDate = GREATEST(latest active delivery, latest active payment) per locked decision
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
    'openingBalanceDate', b.created_at,
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
      COALESCE((SELECT MAX(date) FROM deliveries WHERE branch_id = b.id AND deleted_at IS NULL), '1900-01-01'::DATE),
      COALESCE((SELECT MAX(date) FROM payments   WHERE branch_id = b.id AND deleted_at IS NULL), '1900-01-01'::DATE)
    )
  ) INTO v_result
  FROM branches b
  JOIN districts d ON d.id = b.district_id
  JOIN cities    c ON c.id = d.city_id
  WHERE b.id = p_branch_id;

  IF v_result IS NULL THEN RAISE EXCEPTION 'Branch not found'; END IF;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
```

```sql
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
  SELECT start_date, end_date, granularity INTO v_start, v_end, v_granularity FROM _summary_range(p_range);

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
  SELECT start_date, end_date, granularity INTO v_start, v_end, v_granularity FROM _summary_range(p_range);

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

-- Branch distribution: include both active AND inactive branches with sales in the range.
-- Filter only `d.deleted_at IS NULL` + date range; current is_active state is not relevant to "sales this month".
CREATE OR REPLACE FUNCTION report_branch_distribution(p_range TEXT, p_limit INT DEFAULT 100)
RETURNS JSONB AS $$
DECLARE v_start DATE; v_end DATE; v_granularity TEXT;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT start_date, end_date, granularity INTO v_start, v_end, v_granularity FROM _summary_range(p_range);

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
  SELECT start_date, end_date, granularity INTO v_start, v_end, v_granularity FROM _summary_range(p_range);

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
```

```sql
-- ============================================
-- Branch movements (Hareketler tab, PR-6.2 stub)
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
      SELECT jsonb_agg(row_data ORDER BY date DESC, created_at DESC)
      FROM (
        SELECT
          id::text AS id,
          'delivery'::TEXT AS type,
          date,
          total_sales_amount AS amount,
          NULL::TEXT AS payment_type,
          deleted_at IS NOT NULL AS is_deleted,
          created_at
        FROM deliveries
        WHERE branch_id = p_branch_id
        ORDER BY date DESC, created_at DESC
        LIMIT p_limit OFFSET p_offset
      ) row_data
    ), '[]'::jsonb),
    'payments', COALESCE((
      SELECT jsonb_agg(row_data ORDER BY date DESC, created_at DESC)
      FROM (
        SELECT
          id::text AS id,
          'payment'::TEXT AS type,
          date,
          amount,
          payment_type,
          deleted_at IS NOT NULL AS is_deleted,
          created_at
        FROM payments
        WHERE branch_id = p_branch_id
        ORDER BY date DESC, created_at DESC
        LIMIT p_limit OFFSET p_offset
      ) row_data
    ), '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
```

```sql
-- ============================================
-- Grants (Phase 6 RPCs)
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
```

### 2. Domain types — `src/types/domain.types.ts`

Append the new types declared in Phase 6 roadmap. Re-export `SummaryRange` from `@/types/index.ts`.

### 3. Service contracts — `src/services/contracts.ts`

Add `AdminLocationRepository` (10 methods including `getBranchHubDetails`) and `ReportsRepository` (4 methods). Inject both into `AppServices`.

### 4. Supabase adapters

#### `src/services/supabase/reports.ts` (new)

Maps each contract method to its RPC. Returns domain-shaped objects. Example:

```typescript
export const supabaseReportsRepository: ReportsRepository = {
  async getKpis(range) {
    const { data, error } = await supabaseClient.rpc('report_kpis', { p_range: range });
    if (error) throw error;
    return data as SummaryKpis;
  },
  async getProductDistribution(range) {
    const { data, error } = await supabaseClient.rpc('report_product_distribution', { p_range: range });
    if (error) throw error;
    return (data ?? []) as DistributionRow[];
  },
  async getBranchDistribution(range) {
    const { data, error } = await supabaseClient.rpc('report_branch_distribution', { p_range: range });
    if (error) throw error;
    return (data ?? []) as DistributionRow[];
  },
  async getDailySeries(range) {
    const { data, error } = await supabaseClient.rpc('report_daily_series', { p_range: range });
    if (error) throw error;
    return data as DailySeriesResult;
  },
};
```

#### `src/services/supabase/adminLocations.ts` (new)

Maps each contract method to its RPC. Adapter for `getOpeningBalancesLocked` extracts the boolean from RPC (now returns BOOLEAN directly). Adapter for `getBranchHubDetails` maps JSONB to `BranchHubDetails`.

### 5. Hooks

#### `src/hooks/useReports.ts` (new)

```typescript
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { services } from '@/services';
import type { SummaryRange } from '@/types';

export function useSummaryKpis(range: SummaryRange) {
  return useQuery({
    queryKey: ['reports', 'kpis', range],
    queryFn: () => services.reports.getKpis(range),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useProductDistribution(range: SummaryRange) { /* same shape */ }
export function useBranchDistribution(range: SummaryRange)  { /* same shape */ }
export function useDailySeries(range: SummaryRange)         { /* same shape */ }
```

`keepPreviousData` prevents flicker on range toggle.

#### `src/hooks/useAdminLocations.ts` (new)

```typescript
export function useCitiesWithCounts() {
  return useQuery({
    queryKey: ['admin', 'cities', 'with-counts'],
    queryFn: () => services.adminLocations.listCitiesWithCounts(),
    staleTime: 5 * 60_000,   // reference data
    placeholderData: keepPreviousData,
  });
}

export function useDistrictsWithCounts(cityId: string | null) { /* staleTime 5min */ }
export function useBranchesWithContext(districtId: string | null) { /* staleTime 60s */ }
export function useOpeningBalancesLocked() { /* staleTime 60s */ }

// Mutations: invalidate appropriate queries on success
export function useCreateCity()      { /* onSuccess → invalidateCities */ }
export function useCreateDistrict()  { /* onSuccess → invalidateDistricts(cityId) */ }
export function useCreateBranch()    { /* onSuccess → invalidateBranches(districtId) */ }
export function useSetCityActive()
export function useSetDistrictActive()
export function useSetBranchActive()
export function useSetOpeningBalancesLocked()   // PR-6.3 consumer

export function useBranchHubDetails(branchId: string | undefined | null) {
  return useQuery({
    queryKey: ['admin', 'branch-hub', 'details', branchId],
    queryFn: () => services.adminLocations.getBranchHubDetails(branchId as string),
    enabled: !!branchId,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

// Composite for Branch Hub summary cards (no balance here — consumer uses useBranchBalance)
export function useBranchHubSummary(branchId: string | undefined | null) {
  const details = useBranchHubDetails(branchId);
  const balance = useBranchBalance(branchId);  // existing ledger hook

  return {
    data: details.data && balance.data !== undefined
      ? { currentBalance: balance.data, ...details.data }
      : undefined,
    isLoading: details.isLoading || balance.isLoading,
    isError: details.isError || balance.isError,
    refetch: () => { details.refetch(); balance.refetch(); },
  };
}
```

**Stale time policy** (applied uniformly across PR-6.0 + PR-6.1):
- Reference data (cities / districts) = 5 min
- Transactional lists (branches, balances) = 60 s
- Computed reports (KPIs / distributions / series) = 60 s

#### `src/hooks/index.ts`

Re-export the new hooks.

### 6. Utility — `src/utils/distribution.ts` (new)

```typescript
import type { DistributionRow } from '@/types';

export function mergeTopDistribution(
  rows: readonly DistributionRow[],
  topN: number,
): { merged: DistributionRow[]; mergedCount: number } {
  // Guard against null/NaN/Infinity values
  const cleaned = rows.filter((r) => Number.isFinite(r.value) && r.value > 0);

  if (cleaned.length === 0) return { merged: [], mergedCount: 0 };

  const sorted = [...cleaned].sort((a, b) => b.value - a.value);
  const top = sorted.slice(0, topN);
  const rest = sorted.slice(topN);
  const restValue = rest.reduce((sum, r) => sum + r.value, 0);

  if (restValue === 0 || rest.length === 0) {
    return { merged: top, mergedCount: 0 };
  }

  return {
    merged: [
      ...top,
      {
        id: '__merged__',
        label: `Diğer (${rest.length})`,
        value: restValue,
        isMerged: true,
      },
    ],
    mergedCount: rest.length,
  };
}
```

### 7. Tests

#### `tests/utils/distribution.test.ts` (new, unit)

- Empty input → empty result
- Single row → no merge
- ≤ topN rows → no merge, all returned
- > topN rows → topN + "Diğer (N)" with summed value
- All values zero / non-finite → empty (no "Diğer (0)" slice)
- Null / NaN / Infinity values filtered out
- Sorted descending by value
- Merged row has `isMerged: true`

#### `tests/utils/formatCount.test.ts` (PR-6.1, not PR-6.0 — placeholder noted here for completeness)

#### `tests/integration/rpcs.test.ts` (new, integration)

Prerequisites: `npm run db:start && npm run db:reset && npm run db:seed`. These tests run against the local Supabase instance.

- `report_kpis('week')` returns non-zero `totalSales` / `totalCollection` when fixtures exist
- `report_product_distribution` returns ranked array sorted by value DESC
- `report_branch_distribution` includes branches with sales in range, regardless of `is_active`
- `report_daily_series('week')` returns `granularity = 'day'` and ≤7 points
- `report_daily_series('all')` returns `granularity` based on span (≤90d → day, 91-730 → week, >730 → month)
- `create_city` rejects empty name
- `create_city` rejects duplicate name (UNIQUE constraint)
- `create_branch` rejects negative opening_balance
- `create_branch` rejects non-zero opening_balance when `opening_balances_locked = true`
- `set_city_active` on non-existent id raises "City not found"
- `set_branch_active` on non-existent id raises "Branch not found"
- `get_branch_hub_details` returns all 9 fields for an existing branch
- `get_branch_hub_details` on non-existent id raises "Branch not found"

#### `tests/integration/rls.test.ts` (new, integration)

- Staff JWT calls `report_kpis` → error "Not authorized"
- Staff JWT calls `create_city` → error "Not authorized"
- Staff JWT calls `set_branch_active` → error "Not authorized"
- Staff JWT calls `get_branch_hub_details` → error "Not authorized"
- Staff JWT cannot `SELECT * FROM app_config` (RLS denies)

### 8. PR-6.0 Verification Checklist

- [ ] Migration applies cleanly via `supabase db reset`
- [ ] `supabase gen types` produces no schema drift
- [ ] All RPCs return expected shapes (integration tests)
- [ ] Staff cannot invoke admin RPCs (negative tests)
- [ ] `react-native-gifted-charts` and `react-native-linear-gradient` installed
- [ ] Lint + typecheck pass
- [ ] Placeholder screens still render identically (no UI changes)
- [ ] App boots and signs in as admin without UX changes

---

## PR-6.1 — Özet + Şubeler + Branch Hub Shell

### Goal

Replace the 7 placeholder admin screens with real implementations for **Özet, Şubeler (drill-down), and Branch Hub (shell only — no tabs yet)**. Remove Tahsilatlar placeholder route + nav item. Defer Ürünler, Kayıtlar, Ayarlar placeholders stay (but Tahsilatlar is removed entirely).

### 0. Dependency additions — `package.json`

Add to `dependencies`:
```json
"react-native-gifted-charts": "^1.4.50",
"react-native-linear-gradient": "^2.8.3"
```

Pinned to a recent stable release. Run `npm install` (`react-native-linear-gradient` is autolinked; `react-native-gifted-charts` is pure JS + `react-native-svg` which is already linked).

### 1. New files

```
src/utils/
├── distribution.ts                  (already in PR-6.0)
├── formatCount.ts                   (new — Intl.NumberFormat('tr-TR'))
└── formatRelativeDate.ts            (new — "2 gün önce", "dün", "bugün")

src/screens/admin/
├── SummaryScreen.tsx                (new)
├── BranchesScreen.tsx               (new — drill-down router)
├── BranchHubScreen.tsx              (new — shell only)
├── BranchHubTabsPlaceholder.tsx     (new — empty state per tab)
└── index.ts                         (update — export new screens; remove Tahsilatlar)

src/components/admin/               (new folder)
├── RangeSelector.tsx                (pill segmented control)
├── KpiCard.tsx                      (icon + title + large number)
├── DistributionCard.tsx             (title + pie chart + legend)
├── DailyChartCard.tsx               (title + line chart + empty state)
├── Breadcrumb.tsx                   (clickable segments)
├── GeographyList.tsx                (list + empty state + footer button)
├── GeographyListRow.tsx             (city / district / branch row with active badge)
├── ActionMenu.tsx                   (3-dots menu → bottom sheet)
├── FormSheet.tsx                    (generic bottom sheet, KeyboardAvoidingView)
├── ActiveBadge.tsx                  (green "Aktif" / gray "Pasif" chip)
└── SummaryCard.tsx                  (Branch Hub card)

src/components/ui/badge/             (new — per AGENTS.md gluestack convention)
├── index.tsx
├── index.web.tsx
└── styles.tsx

src/app/(admin)/
├── branches.tsx                     (UPDATE — use BranchesScreen)
├── summary.tsx                      (UPDATE — use SummaryScreen)
├── branches/
│   └── [branchId].tsx               (new — BranchHubScreen)
└── payments.tsx                     (DELETE — route removed per Tahsilatlar decision)

src/app/(admin)/_layout.tsx          (UPDATE if needed — n/a, AdminShell hosts nav)

src/screens/admin/AdminShell.tsx     (UPDATE — remove Tahsilatlar nav item)

src/hooks/
├── useGeographyDrilldown.ts         (new — query param state)
└── (no useSummaryRange — use useState directly)
```

### 2. `Badge` component (`src/components/ui/badge/`)

Per AGENTS.md "create a new component in `src/components/ui/<name>/`" rule. Variants via `tva`:

```typescript
// styles.tsx
import { tva } from '@gluestack-ui/utils/nativewind-utils';

export const badgeStyle = tva({
  base: 'px-2 py-0.5 rounded-md self-start',
  variants: {
    variant: {
      success: 'bg-primary/10',
      muted:   'bg-muted',
      destructive: 'bg-destructive/10',
      info:    'bg-info/10',
    },
  },
});

export const badgeTextStyle = tva({
  base: 'text-xs font-heavy',
  variants: {
    variant: {
      success: 'text-primary',
      muted:   'text-muted-foreground',
      destructive: 'text-destructive',
      info:    'text-info',
    },
  },
});
```

Component: `<Badge variant="success" text="Aktif" />`. Exports from `src/components/ui/index.ts`.

### 3. `RangeSelector` component (pill segmented control)

```typescript
type RangeSelectorProps = {
  value: SummaryRange;
  onChange: (range: SummaryRange) => void;
};

// Visual: horizontal pill with 3 segments, active segment = bg-primary text-primary-foreground
// Touch target: each segment ≥ 64px tall (tablet landscape)
// Implementation: HStack of 3 Pressable, no third-party library
// RENDERED OUTSIDE the ScrollView (per locked decision) to be natively sticky
```

### 4. `KpiCard` component

```typescript
type KpiCardProps = {
  icon: React.ElementType;
  title: string;
  value: number | null;
  format: 'currency' | 'count';
  isLoading?: boolean;
  onRetry?: () => void;
};

// Layout:
//   <Box bg-card border border-border rounded-2xl p-4>
//     <HStack space="sm">
//       <Box bg-primary/10 h-10 w-10 rounded-xl items-center justify-center>
//         <Icon as={icon} size="md" className="text-primary" />
//       </Box>
//       <VStack space="xs">
//         <Text size="sm" className="text-muted-foreground">{title}</Text>
//         {isLoading || value === null ? <Spinner /> : <Text size="2xl" bold>{formatFn(value)}</Text>}
//       </VStack>
//     </HStack>
//   </Box>
// Error: small red "!" + retry button → calls onRetry
```

### 5. `DistributionCard` (pie chart)

```typescript
// react-native-gifted-charts: <PieChart data={...} donut radius={80} innerRadius={50} />
// Legend below: list of [color, label, percentage]
// Empty state when total is 0: <EmptyState title="Bu aralıkta veri yok" />
```

Uses `mergeTopDistribution(rows, 7)` from `src/utils/distribution.ts` before rendering. Style merged slice distinctly (greyed out).

### 6. `DailyChartCard` — line chart

```typescript
// react-native-gifted-charts: <LineChart data={...} thickness={2} color={primary} />
// Granularity-aware x-axis labels:
//   day   → '24 Ağu' (tr-TR short, noLabels on small buckets)
//   week  → 'W34'
//   month → 'Ağu 26'
// Y-axis: currency, abbreviated ('₺5K', '₺12.5K') using gifted-charts' yAxisLabelPrefix
// Empty state: "Bu aralıkta veri yok"
```

### 7. `SummaryScreen` (full implementation outline)

```typescript
export function SummaryScreen() {
  const [range, setRange] = useState<SummaryRange>('week');
  const queryClient = useQueryClient();

  const kpis        = useSummaryKpis(range);
  const productDist = useProductDistribution(range);
  const branchDist  = useBranchDistribution(range);
  const dailySeries = useDailySeries(range);

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['reports'] });
  };

  return (
    <Box className="flex-1 bg-background">
      <RangeSelector value={range} onChange={setRange} />
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={false} onRefresh={refreshAll} />}
      >
        <VStack space="md" className="p-6">
          <HStack space="md">
            <KpiCard icon={BanknoteIcon}  title="Toplam Satış"    value={kpis.data?.totalSales}          format="currency" isLoading={kpis.isLoading} onRetry={kpis.refetch} />
            <KpiCard icon={BanknoteIcon}  title="Toplam Tahsilat" value={kpis.data?.totalCollection}     format="currency" isLoading={kpis.isLoading} onRetry={kpis.refetch} />
            <KpiCard icon={StoreIcon}     title="Aktif Şube"      value={kpis.data?.activeBranchCount}   format="count"    isLoading={kpis.isLoading} onRetry={kpis.refetch} />
            <KpiCard icon={PackageIcon}   title="Aktif Ürün"      value={kpis.data?.activeProductCount}  format="count"    isLoading={kpis.isLoading} onRetry={kpis.refetch} />
          </HStack>

          <HStack space="md">
            <DistributionCard title="Ürün Dağılımı" rows={productDist.data ?? []} isLoading={productDist.isLoading} onRetry={productDist.refetch} />
            <DistributionCard title="Şube Dağılımı"  rows={branchDist.data ?? []}  isLoading={branchDist.isLoading}  onRetry={branchDist.refetch}  />
          </HStack>

          <DailyChartCard series={dailySeries.data} isLoading={dailySeries.isLoading} onRetry={dailySeries.refetch} />
        </VStack>
      </ScrollView>
    </Box>
  );
}
```

Note: Tahsilatlar total uses **BanknoteIcon** with a subtle color variant (passed via prop or className override). Both money cards share the same icon for consistency.

### 8. `useGeographyDrilldown` hook (query-param state)

```typescript
// src/hooks/useGeographyDrilldown.ts
export type DrilldownLevel = 'cities' | 'districts' | 'branches';

export function useGeographyDrilldown() {
  const params = useLocalSearchParams<{ city?: string | string[]; district?: string | string[] }>();

  const cityId = pickFirst(params.city);
  const districtId = pickFirst(params.district);

  const level: DrilldownLevel =
    !cityId ? 'cities' :
    !districtId ? 'districts' : 'branches';

  return { level, selectedCityId: cityId, selectedDistrictId: districtId };
}

function pickFirst(v: string | string[] | undefined): string | null {
  if (v === undefined) return null;
  if (Array.isArray(v)) return v[0] ?? null;
  return v;
}
```

Drill-down navigation pattern (Expo Router 57):

```typescript
// Tap row: add a level
router.push({ pathname: '/branches', params: { city: id } });

// Tap breadcrumb segment to go up: clear the deeper param
router.setParams({ district: undefined });   // clears district, keeps city
router.setParams({ city: undefined, district: undefined });  // back to root

// OR jump straight to root:
router.push('/branches');   // pops current param state
```

Hardware back goes up one level (Expo Router removes one query param per back press).

### 9. `Breadcrumb` component

```typescript
type BreadcrumbProps = {
  level: DrilldownLevel;
  cityName?: string;
  districtName?: string;
};

// Renders:
//   cities    → "Şehirler"
//   districts → "Bursa > İlçeler"  (tap "Bursa" → router.push('/branches'))
//   branches  → "Bursa > Merkez > Şubeler"  (tap "Bursa" → root; tap "Merkez" → router.setParams({ district: undefined }))
// Each non-current segment is a Pressable
// Current segment is bold + non-interactive
// Hardware back: handled by Expo Router automatically
```

### 10. `BranchesScreen` (drill-down router)

```typescript
export function BranchesScreen() {
  const { level, selectedCityId, selectedDistrictId } = useGeographyDrilldown();

  const citiesQuery    = useCitiesWithCounts();
  const cityName       = citiesQuery.data?.find(c => c.id === selectedCityId)?.name;

  const districtsQuery = useDistrictsWithCounts(level !== 'cities' ? selectedCityId : null);
  const districtName   = districtsQuery.data?.find(d => d.id === selectedDistrictId)?.name;

  const branchesQuery  = useBranchesWithContext(level === 'branches' ? selectedDistrictId : null);

  // Mutations
  const createCity     = useCreateCity();
  const createDistrict = useCreateDistrict();
  const createBranch   = useCreateBranch();
  const setCityActive  = useSetCityActive();
  const setDistrictActive = useSetDistrictActive();
  const setBranchActive = useSetBranchActive();

  return (
    <Box className="flex-1 bg-background">
      <Breadcrumb level={level} cityName={cityName} districtName={districtName} />

      {level === 'cities' && (
        <GeographyList
          isLoading={citiesQuery.isLoading}
          rows={citiesQuery.data ?? []}
          renderRow={(city) => (
            <GeographyListRow
              key={city.id}
              title={city.name}
              subtitle={`${city.districtCount} ilçe • ${city.branchCount} şube`}
              isActive={city.isActive}
              onPress={() => router.push({ pathname: '/branches', params: { city: city.id } })}
              onMenu={() => ActionMenu.present({ kind: 'city', entity: city, ... })}
            />
          )}
          emptyState="Henüz şehir yok"
          footerButton={<NewCityButton onSubmit={(name) => createCity.mutateAsync({ name })} />}
        />
      )}

      {level === 'districts' && ( /* similar */ )}
      {level === 'branches' && ( /* similar */ )}
    </Box>
  );
}
```

### 11. Sheet pattern (Yeni Şehir / Yeni İlçe / Yeni Şube)

`FormSheet` is a generic bottom-anchored modal wrapping a form. **Wrap content in `KeyboardAvoidingView`** (Android: `behavior="height"`):

```typescript
// src/components/admin/FormSheet.tsx
type FormSheetProps<T> = {
  open: boolean;
  title: string;
  fields: FormField[];          // [{ name, label, type: 'text' | 'numeric' | 'boolean', required }]
  submitLabel?: string;
  onSubmit: (values: T) => Promise<void>;
  onCancel: () => void;
  initialValues?: Partial<T>;
  serverError?: string;
};

export function FormSheet({ open, title, fields, onSubmit, onCancel, serverError }: FormSheetProps<any>) {
  // Implementation: Modal + bottom-anchored Box + KeyboardAvoidingView
  //   - VStack of fields (Input for text/numeric; Toggle for boolean)
  //   - HStack Cancel + Submit (Submit disabled until valid)
  //   - serverError shown as small red text below submit row
}
```

For Yeni Şube specifically:

```typescript
const openingBalancesLocked = useOpeningBalancesLocked();

<FormSheet
  open={open}
  title="Yeni Şube"
  fields={[
    { name: 'name', label: 'Şube Adı', type: 'text', required: true },
    ...(!openingBalancesLocked.data
      ? [{ name: 'openingBalance', label: 'Açılış Bakiyesi', type: 'numeric', required: false }]
      : []),
    { name: 'isActive', label: 'Aktif', type: 'boolean', defaultValue: true },
  ]}
  onSubmit={async (values) => {
    await createBranch.mutateAsync({
      districtId,
      name: values.name,
      openingBalance: values.openingBalance ?? 0,
      isActive: values.isActive ?? true,
    });
  }}
/>
```

### 12. Branch Hub shell

`BranchHubScreen` (`/branches/[branchId]`):

```typescript
export function BranchHubScreen() {
  const params = useLocalSearchParams<{ branchId: string | string[] }>();
  const branchId = pickFirst(params.branchId);   // string | null
  const [activeTab, setActiveTab] = useState<'products' | 'movements' | 'details'>('products');

  const summary = useBranchHubSummary(branchId);

  if (!branchId) {
    return <ErrorState title="Şube bulunamadı" />;
  }

  return (
    <ScrollView className="flex-1 bg-background">
      <VStack space="md" className="p-6">
        <VStack space="xs">
          <Text size="2xl" bold className="text-foreground">{summary.data?.name}</Text>
          <Text size="sm" className="text-muted-foreground">
            {summary.data?.cityName} / {summary.data?.districtName}
          </Text>
          <ActiveBadge isActive={summary.data?.isActive ?? false} />
        </VStack>

        <HStack space="md">
          <SummaryCard
            title="Güncel Bakiye"
            value={summary.data?.currentBalance ?? null}
            format="currency"
            colorCoded
          />
          <SummaryCard
            title="Aktif Ürün"
            value={`${summary.data?.activeProductCount ?? 0} / ${summary.data?.totalProductCount ?? 0}`}
            format="text"
          />
          <SummaryCard
            title="Son İşlem"
            value={formatRelativeDate(summary.data?.lastMovementDate ?? null)}
            format="text"
          />
          <SummaryCard
            title="Açılış Bakiyesi"
            value={summary.data?.openingBalance ?? null}
            format="currency"
            subtitle={summary.data?.openingBalanceDate ? formatDate(summary.data.openingBalanceDate) : undefined}
          />
        </HStack>

        <HStack className="border-b border-border">
          {(['products', 'movements', 'details'] as const).map(tab => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              className={`flex-1 py-3 items-center border-b-2 ${
                activeTab === tab ? 'border-primary' : 'border-transparent'
              }`}
            >
              <Text bold={activeTab === tab} className={activeTab === tab ? 'text-primary' : 'text-muted-foreground'}>
                {tab === 'products' ? 'Ürünler & Fiyatlar' : tab === 'movements' ? 'Hareketler' : 'Detaylar'}
              </Text>
            </Pressable>
          ))}
        </HStack>

        {activeTab === 'products' && <EmptyState title="Ürünler & Fiyatlar" subtitle="PR-6.2'de gelecek" />}
        {activeTab === 'movements' && <EmptyState title="Hareketler" subtitle="PR-6.2'de gelecek" />}
        {activeTab === 'details' && <EmptyState title="Detaylar" subtitle="PR-6.2'de gelecek" />}
      </VStack>
    </ScrollView>
  );
}
```

### 13. Wire-up

- `src/app/(admin)/summary.tsx` → `<SummaryScreen />`
- `src/app/(admin)/branches.tsx` → `<BranchesScreen />`
- `src/app/(admin)/branches/[branchId].tsx` → `<BranchHubScreen />`
- `src/app/(admin)/payments.tsx` → **DELETE** (Tahsilatlar removed)
- `src/screens/admin/index.ts` → update exports (remove `AdminPlaceholderScreen` if unused, add new screens)

### 14. AdminShell — remove Tahsilatlar

```typescript
const NAV_ITEMS: { href: Href; label: string; icon: React.ElementType }[] = [
  { href: '/summary', label: 'Özet', icon: BarChart3Icon },
  { href: '/branches', label: 'Şubeler', icon: StoreIcon },
  { href: '/products', label: 'Ürünler', icon: PackageIcon },
  { href: '/records', label: 'Kayıtlar', icon: ListIcon },
  { href: '/settings', label: 'Ayarlar', icon: SettingsIcon },
];
```

### 15. PR-6.1 Verification Checklist

- [ ] Özet shows 4 KPI cards with live data
- [ ] Range selector changes data on all 4 cards (test Bu Hafta / Bu Ay / Tüm Zamanlar)
- [ ] Range toggle does NOT flash loading state (placeholderData holds previous)
- [ ] Distribution pies render with correct slices + legend; merge shows "Diğer (N)" when >7 items
- [ ] Distribution pies show empty state when total is 0
- [ ] Daily line chart renders with correct granularity (test all 3 ranges)
- [ ] Empty state shows cleanly when no data
- [ ] Şubeler: tap city row → districts list; tap district row → branches list
- [ ] Breadcrumb updates correctly at each level; tap on segment jumps up
- [ ] Hardware back goes up one level (no app exit)
- [ ] City/district rows show active badge; inactive rows sort below
- [ ] Yeni Şehir / Yeni İlçe / Yeni Şube sheets create records; errors displayed inline
- [ ] Yeni Şube sheet shows opening_balance field only when `opening_balances_locked = false`
- [ ] Tap branch row → Branch Hub opens
- [ ] Branch Hub header shows name + city/district + active badge
- [ ] Branch Hub summary cards show live values; "Açılış Bakiyesi" is read-only
- [ ] Tab row is visible but content is empty (PR-6.2 ships)
- [ ] Pull-to-refresh on Özet refetches all 4 data sources
- [ ] Lint + typecheck + tests pass
- [ ] Tablet landscape smoke: sign in → Özet → Şubeler → drill-down → Yeni Şehir → Branch Hub
- [ ] No regressions in staff workflow
- [ ] Tahsilatlar route file + nav item removed (no orphan imports)
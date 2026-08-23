# Phase 6: Admin Master Data And Balance Operations

## Goal

Give administrators safe operational management for catalog data, prices, branch balances, historical corrections, and manual payments via the tablet admin panel — with backend safety guaranteed by Supabase RPCs, RLS, and audit logging.

## Non-Goals (Deferred)

- Dashboard analytics with custom date range or scope filter (city / district / branch / product) → Phase 7
- XLSX exports → Phase 7
- Audit log viewer UI → Phase 7
- Email automation (cron, Resend) → Phase 8
- Settings → Email recipients management → Phase 8
- Standalone Ürünler screen (global product catalog view) → PR-6.3

## Locked Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Admin nav layout | Bottom bar, **5 items** | Consistency with staff; tablet landscape friendly |
| Nav items | **Özet, Şubeler, Ürünler, Kayıtlar, Ayarlar** | Tahsilatlar merged into Kayıtlar as "Yeni Manuel Tahsilat" action; Kullanıcılar merged into Ayarlar |
| Tahsilatlar as separate tab | **Dropped** in PR-6.1 — route + nav item removed | Manual payment is a financial record, lives with records |
| Chart library | `react-native-gifted-charts` (+ `react-native-linear-gradient` peer) | Pure JS, no native rebuild, supports pie + line + bar; needs explicit install in PR-6.0 |
| Pie "Diğer" merge | Top 7 + "Diğer (N)" | Fixed count, predictable, label shows merge count |
| "Aktif Ürün" KPI | `COUNT(DISTINCT products WHERE is_active AND EXISTS active branch_product)` | One count per product, not per slot |
| "Aktif Şube" KPI | `COUNT(branches WHERE is_active = true)` | Snapshot, not range-dependent |
| Range selector | Pill segmented control: Bu Hafta / Bu Ay / Tüm Zamanlar | Drives all KPI / distribution / series data |
| Bu Hafta definition | Calendar week Mon→Sun, `Europe/Istanbul` | Aligns with daily business cycle |
| All-time bucketing | ≤90d daily / 91-730d weekly / >730d monthly | Heuristic; fits ≤100 points per chart |
| Geography list ordering | Active-first (`ORDER BY is_active DESC, name ASC`) | Inactive items surface below |
| Geography delete | Soft delete only (`is_active` flag) | Receipts reference districts/branches; never hard delete |
| Product delete | Deactivation only; protected when referenced by receipts | Same principle as geography |
| Price editing | Inline pen icon → small sheet (price + Cancel/Submit) | No date field; effective_from = today (Istanbul) |
| First activation | Sheet requires price + effective_from date | No existing period to close |
| Price validation | Strictly > 0 (no zero); numeric(12,2) | Reject 0 TL on client + server |
| Opening balance decision | At branch creation only (Yeni Şube sheet) | Locked after go-live via `app_config.opening_balances_locked` |
| User invite | Supabase Edge Function (PR-6.3) | Service-role key cannot live in tablet client |
| Data fetching pattern | One focused RPC per data shape; parallel React Query hooks | Cleaner contracts, selective cache, parallel fetch |
| RPC authz pattern | `IF NOT is_admin() THEN RAISE EXCEPTION ... END IF` at function start | Same convention as Phase 3 RPCs |
| SCD2 conflict policy | Last-write-wins; server validates no-overlap constraint | Existing `no_overlapping_prices` EXCLUDE constraint enforces |
| Range selector position | Outside `ScrollView`, fixed at top of screen | Native sticky on Android requires `stickyHeaderIndices` or reanimated; simpler to keep out of scroll |
| Sheet keyboard handling | Wrap sheet content in `KeyboardAvoidingView` | Avoids Android keyboard covering Submit button |
| `placeholderData` on range hooks | `keepPreviousData` on all 4 summary hooks + geography hooks | Smooth range-toggle UX without loading flicker |
| Phase 7 boundary | Kayıtlar ships in PR-6.3 as list + edit + soft-delete only; XLSX export + audit log drawer are Phase 7 | Avoids phase overlap on records screen |

## Architecture Boundaries

Unchanged from `00-execution-map.md`:

- `src/app` — route composition + guards only
- `src/screens` — role-specific page composition; no direct Supabase calls
- `src/components` — reusable presentational + domain UI
- `src/hooks` — query / mutation / form / screen orchestration
- `src/services/contracts.ts` — domain-oriented repository interfaces
- `src/services/supabase` — contract implementations; database + RPC only
- `src/store` — ephemeral UI / session state only
- `src/types` — generated DB types + domain types
- `src/utils` — pure helpers (formatting, date-range, validation, export, distribution merge)

## Per-Screen Spec — This Batch (PR-6.0 + PR-6.1)

### Özet (Summary) — `/summary`

**Layout (top to bottom):**

1. **Range selector** (fixed top, outside ScrollView): pill segmented control, 3 segments
   - `Bu Hafta` → `date_trunc('week', today)::date` → today
   - `Bu Ay` → `date_trunc('month', today)::date` → today
   - `Tüm Zamanlar` → `MIN(deliveries.date WHERE deleted_at IS NULL)` → today

2. **KPI row** (4 equal-width cards on landscape):
   - `Toplam Satış` — BanknoteIcon, sum of `deliveries.total_sales_amount` (active, in range)
   - `Toplam Tahsilat` — BanknoteIcon variant (same icon, distinct color), sum of `payments.amount` (active, in range)
   - `Aktif Şube` — StoreIcon, `COUNT(branches WHERE is_active)`
   - `Aktif Ürün` — PackageIcon, distinct products with ≥1 active branch_product

   Card layout: small icon top-left (primary), title (sm, muted), value (xl, bold). Currency cards use `formatCurrency`; count cards use `formatCount`.

3. **Distribution row** (2 equal cards):
   - **Ürün Dağılımı** (left): pie chart of sales by product (top 7 + "Diğer (N)")
   - **Şube Dağılımı** (right): pie chart of sales by branch (top 7 + "Diğer (N)")

   Each card: title, pie chart with legend below. Empty state when total is 0: "Bu aralıkta veri yok".

4. **Daily earnings chart** (bottom, full width):
   - Line chart of sales per bucket within the selected range
   - Granularity decided server-side (`day` for week/month, heuristic for `all`)
   - X-axis labels formatted from `bucket` based on `granularity`
   - Empty state: "Bu aralıkta veri yok"

**Data flow:**

```
SummaryScreen
├── range: useState<SummaryRange>('week')
├── useSummaryKpis(range)          → 4 numbers
├── useProductDistribution(range)  → ranked rows (UI merges top 7 + Diğer)
├── useBranchDistribution(range)   → ranked rows
└── useDailySeries(range)          → { granularity, points }
```

All hooks refetch automatically when `range` changes (cache key includes range). Pull-to-refresh forces refetch.

**Loading state:** each card shows its own spinner; layout doesn't shift. Error: each card shows inline retry.

### Şubeler (Branches) — `/branches` (drill-down)

**Pattern:** three lists (cities / districts / branches). One list visible at a time. Breadcrumb header showing path. Drill-down via tap on row.

**Route structure:**

```
/branches                    → cities list
/branches?city=<id>          → districts list of selected city
/branches?city=<id>&district=<id>  → branches list of selected district
/branches/[branchId]         → Branch Hub (separate route, deep-linkable)
```

Use query params for drill-down state (not nested routes) so back navigation is query-param removal and breadcrumb taps are query-param changes. URL becomes shareable + deep-linkable.

**Navigation pattern:**

- Initial drill-down: `router.push({ pathname: '/branches', params: { city: id } })`
- Change existing params (district → clear city): `router.setParams({ city: undefined, district: undefined })` (use `undefined` to REMOVE; use `router.setParams({ city: id })` to ADD)
- Breadcrumb tap-up: `router.setParams({ district: undefined })` to clear lower level; or `router.push('/branches')` to go to root
- Hardware back: handled by Expo Router automatically (URL query-param removal)

**Header (breadcrumb style):**

- At cities level: `Şehirler`
- At districts level: `Bursa > İlçeler` (tap "Bursa" → cities)
- At branches level: `Bursa > Merkez > Şubeler` (tap "Bursa" → cities; tap "Merkez" → districts)

Hardware back goes up one level (remove one query param). Tap on breadcrumb segment jumps to that level.

**City list (`/branches`):**

- Row: city name (large, bold) + active badge (green "Aktif" / gray "Pasif") + secondary line "{N} ilçe • {M} şube" + ⋮ button (right)
- Rows ordered active-first, then by name
- ⋮ menu (sheet from bottom):
  - Düzenle (rename) → opens name-edit sheet
  - Aktifleştir / Pasife Al (toggle, with confirmation)
- Empty state: "Henüz şehir yok" + Yeni Şehir CTA
- Footer button: `+ Yeni Şehir` → sheet (name input, single field)

**District list (`/branches?city=<id>`):**

- Row: district name + active badge + secondary line "{N} şube • {M} aktif" + ⋮ button
- Rows ordered active-first, then by name
- ⋮ menu: Düzenle, Pasife Al / Aktifleştir
- Footer button: `+ Yeni İlçe` → sheet (name input)

**Branch list (`/branches?city=<id>&district=<id>`):**

- Row: branch name (large, bold) + active badge + secondary line current balance (color-coded: red = owes us / positive, green = credit / negative) + ⋮ button
- Rows ordered active-first, then by name
- **Tap row body → `/branches/[branchId]` (Branch Hub)**
- ⋮ menu:
  - Şube Ekranı → Branch Hub
  - Düzenle → rename sheet
  - Pasife Al / Aktifleştir → toggle with confirmation
- Footer button: `+ Yeni Şube` → sheet:
  - Name (required)
  - Açılış Bakiyesi (numeric, visible only while `opening_balances_locked = false`)
  - Aktif toggle (default true)

**Sheet pattern:** bottom-anchored sheet with form fields + Cancel/Submit. Sheet content wrapped in `KeyboardAvoidingView` (Android: `behavior="height"`; iOS: `padding` — Android-only target per SRS). Inline error message under field on validation failure. Submit disabled until valid.

### Branch Hub — `/branches/[branchId]` (PR-6.1 ships shell; PR-6.2 ships tabs)

**Layout:**

1. **Header section**
   - Branch name (large, bold)
   - "Bursa / Merkez" subtitle
   - Active badge (green "Aktif" / gray "Pasif")

2. **Summary cards row** (4 cards):
   - **Güncel Bakiye** — current balance (color-coded), formatted currency
   - **Aktif Ürün Sayısı** — "12 / 16" (active count / total catalog)
   - **Son İşlem** — relative date "2 gün önce" (uses `formatRelativeDate`), with tooltip showing exact date
   - **Açılış Bakiyesi** — read-only currency + "23.05.2024'ten beri" subtitle

3. **Tabs row** (PR-6.1 stub only): Ürünler & Fiyatlar | Hareketler | Detaylar
   - PR-6.1 ships the tab row as visual stub with empty state per tab
   - PR-6.2 ships Ürünler & Fiyatlar + Hareketler implementations
   - Detaylar ships as read-only metadata placeholder in PR-6.2

## Per-Screen Spec — Deferred

### Branch Hub Tabs (PR-6.2)

- **Ürünler & Fiyatlar**: product card grid (image + name + price + pen icon). Price pen opens small sheet (price input + Cancel/Submit, no date field). "+ Aktifleştir" button on inactive products → activation sheet (price + effective_from date, required). Long-press on active product → "Pasife Al" option. **SCD2 algorithm** for in-place price edit:
  ```sql
  -- 1. Close current open period
  UPDATE branch_product_prices
  SET end_date = (p_effective_from - INTERVAL '1 day')::DATE
  WHERE branch_product_id = p_branch_product_id AND end_date IS NULL;
  -- 2. Insert new open period
  INSERT INTO branch_product_prices (branch_product_id, price, start_date)
  VALUES (p_branch_product_id, p_new_price, p_effective_from);
  ```
  Both steps in one transaction; EXCLUDE constraint enforces no-overlap.
- **Hareketler**: chronological list of deliveries + payments for this branch. Newest first. Type icon (delivery/payment) + date + total + actor. Paginated (50 per page).
- **Detaylar**: read-only metadata (created_at, district full path, opening balance + date, audit count).

### Ürünler Screen (PR-6.3)

Two-pane: left product list, right branch availability. Add / edit product sheets. Toggle active per branch.

### Kayıtlar Screen (PR-6.3)

Three-pane: filters / list / detail drawer. Soft-delete with reason. "Yeni Manuel Tahsilat" primary action (floating button at top-right). **Scope**: filterable list + edit + soft-delete + manual payment entry. **Out of scope for PR-6.3**: XLSX export, audit log viewer (Phase 7).

### Ayarlar Screen (PR-6.3)

Profile section + Kullanıcılar (admin only) + Açılış Bakiyesi İçe Aktar (visible only while unlocked; locked via `set_opening_balances_locked` RPC from this screen).

## Database Changes

### Migration: `20240101000007_phase6_admin_foundation.sql`

**Schema changes:**

```sql
-- Geography soft-delete support
ALTER TABLE cities    ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE districts ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX idx_cities_active    ON cities(is_active);
CREATE INDEX idx_districts_active ON districts(is_active);

-- Single-row app config (opening balance lock, future flags)
CREATE TABLE app_config (
  id                       UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001'::UUID,
  opening_balances_locked  BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

-- Enforce single row
CREATE UNIQUE INDEX app_config_singleton ON app_config((TRUE));

INSERT INTO app_config (opening_balances_locked) VALUES (FALSE)
ON CONFLICT DO NOTHING;

-- RLS: deny all direct client access; only SECURITY DEFINER RPCs touch this table
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER app_config_updated_at BEFORE UPDATE ON app_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

**New RPCs (PR-6.0):**

| RPC | Returns | Authz |
|---|---|---|
| `create_city(p_name TEXT)` | `UUID` | admin |
| `create_district(p_city_id UUID, p_name TEXT)` | `UUID` | admin |
| `create_branch(p_district_id UUID, p_name TEXT, p_opening_balance NUMERIC, p_is_active BOOLEAN)` | `UUID` | admin |
| `set_city_active(p_city_id UUID, p_is_active BOOLEAN)` | `VOID` | admin |
| `set_district_active(p_district_id UUID, p_is_active BOOLEAN)` | `VOID` | admin |
| `set_branch_active(p_branch_id UUID, p_is_active BOOLEAN)` | `VOID` | admin |
| `set_opening_balances_locked(p_locked BOOLEAN)` | `VOID` | admin (used by Ayarlar in PR-6.3) |
| `list_cities_with_counts()` | `JSONB` | admin |
| `list_districts_with_counts(p_city_id UUID)` | `JSONB` | admin |
| `list_branches_with_context(p_district_id UUID)` | `JSONB` | admin |
| `get_opening_balances_locked()` | `BOOLEAN` | admin |
| `get_branch_hub_details(p_branch_id UUID)` | `JSONB` | admin |
| `report_kpis(p_range TEXT)` | `JSONB` | admin |
| `report_product_distribution(p_range TEXT, p_limit INT DEFAULT 100)` | `JSONB` | admin |
| `report_branch_distribution(p_range TEXT, p_limit INT DEFAULT 100)` | `JSONB` | admin |
| `report_daily_series(p_range TEXT)` | `JSONB` | admin |
| `list_branch_movements(p_branch_id UUID, p_limit INT DEFAULT 50, p_offset INT DEFAULT 0)` | `JSONB` | admin |

**Existing RPCs reused:**

- `get_branch_balance(branch_id UUID)` — Branch Hub summary
- `record_manual_payment_atomic` — manual payments (PR-6.3)
- `soft_delete_delivery_atomic` — record deletion (PR-6.3)
- `update_delivery_atomic` — record edit (PR-6.3)

**Helper (internal, no grant):**

- `_summary_range(p_range TEXT)` → `(start_date DATE, end_date DATE, granularity TEXT)` marked `STABLE` (NOT IMMUTABLE — reads `NOW()` and tables).

### Edge Function (PR-6.3):

- `admin-invite-user` (Supabase Edge Function, Deno)
  - POST endpoint, accepts admin bearer token
  - Verifies caller is admin via internal `is_admin` check
  - Calls `supabase.auth.admin.createUser({ email, password: tempPassword, email_confirm: true })`
  - Inserts into `public.users` with `(id, full_name, username, role, is_active)`
  - Returns `{ userId, temporaryPassword }`

## Service Layer Additions

### `src/services/contracts.ts` — new interfaces

```typescript
export type SummaryRange = 'week' | 'month' | 'all';

export interface AdminLocationRepository {
  listCitiesWithCounts(): Promise<CityWithCounts[]>;
  listDistrictsWithCounts(cityId: string): Promise<DistrictWithCounts[]>;
  listBranchesWithContext(districtId: string): Promise<BranchWithContext[]>;
  createCity(input: CreateCityInput): Promise<City>;
  createDistrict(input: CreateDistrictInput): Promise<District>;
  createBranch(input: CreateBranchInput): Promise<Branch>;
  setCityActive(id: string, isActive: boolean): Promise<void>;
  setDistrictActive(id: string, isActive: boolean): Promise<void>;
  setBranchActive(id: string, isActive: boolean): Promise<void>;
  getOpeningBalancesLocked(): Promise<boolean>;
  getBranchHubDetails(branchId: string): Promise<BranchHubDetails>;
}

export interface ReportsRepository {
  getKpis(range: SummaryRange): Promise<SummaryKpis>;
  getProductDistribution(range: SummaryRange): Promise<DistributionRow[]>;
  getBranchDistribution(range: SummaryRange): Promise<DistributionRow[]>;
  getDailySeries(range: SummaryRange): Promise<DailySeriesResult>;
}

export interface AppServices {
  // ... existing
  adminLocations: AdminLocationRepository;
  reports: ReportsRepository;
}
```

### `src/types/domain.types.ts` — new types

```typescript
export interface SummaryKpis {
  totalSales: number;
  totalCollection: number;
  activeBranchCount: number;
  activeProductCount: number;
}

export interface DistributionRow {
  id: string;
  label: string;
  value: number;
  isMerged?: boolean;   // true for the "Diğer (N)" synthetic row
}

export interface DailySeriesPoint {
  bucket: string;   // Always YYYY-MM-DD; granularity determines label formatting client-side
  sales: number;
}

export interface DailySeriesResult {
  granularity: 'day' | 'week' | 'month';
  points: DailySeriesPoint[];
}

export interface BranchHubDetails {
  name: string;
  districtName: string;
  cityName: string;
  openingBalance: number;
  branchCreatedAt: string;
  isActive: boolean;
  activeProductCount: number;
  totalProductCount: number;
  lastMovementDate: string | null;
}

export interface CityWithCounts extends City {
  districtCount: number;
  branchCount: number;
  isActive: boolean;
}

export interface DistrictWithCounts extends District {
  branchCount: number;
  activeBranchCount: number;
  isActive: boolean;
}

export interface BranchWithContext extends Branch {
  currentBalance: number;
  activeProductCount: number;
  isActive: boolean;
}

export interface CreateCityInput { name: string; }
export interface CreateDistrictInput { cityId: string; name: string; }
export interface CreateBranchInput {
  districtId: string;
  name: string;
  openingBalance: number;
  isActive: boolean;
}
```

### `src/utils/formatCount` and `src/utils/formatRelativeDate`

Added in PR-6.1 (consumed by Özet + Branch Hub). Signature:
- `formatCount(value: number): string` — Turkish locale integer (`new Intl.NumberFormat('tr-TR')`)
- `formatRelativeDate(value: string | null): string` — relative Turkish ("2 gün önce", "dün", "bugün", "geçen hafta")

## PR Breakdown

| PR | Scope | Size |
|---|---|---|
| PR-6.0 | Foundation: migration + RPCs + contracts + hooks + chart lib install (no UI changes) | M |
| PR-6.1 | Özet + Şubeler (drill-down) + Branch Hub shell (no tabs); also: chart lib, Badge, formatters, distribution helper, Tahsilatlar route removal | L |
| PR-6.2 | Branch Hub tabs: Ürünler & Fiyatlar + Hareketler + Detaylar placeholder; price SCD2 RPCs | L |
| PR-6.3 | Ürünler + Kayıtlar + Ayarlar + Edge Function + edit/delete receipts | XL |

Detailed PR-6.0 + PR-6.1 plan: see `06a-foundation-summary-and-branches.md`

## Verification

- Lint, type-check, automated tests pass for each PR
- `supabase db reset` applies all migrations cleanly
- New RPCs return expected values via integration tests
- RLS denies staff access to admin RPCs (negative tests)
- Range selector refetches all 4 data sources without flicker (placeholderData holds previous)
- Tablet landscape smoke test: login as admin → Özet shows live KPIs → Şubeler → create city/district/branch → Branch Hub summary cards reflect state

## Exit Gate

An admin can use the tablet to manage geography (cities / districts / branches), see real-time business KPIs and distributions, and drill into any branch — without corrupting financial history or bypassing RLS.
-- Fix: same hardening pattern as 20240101000007_fix_search_path.sql,
-- extended to Phase 6 admin RPCs. `search_path = ''` makes unqualified
-- references (tables + sibling functions) unresolvable; this restores
-- `public, pg_catalog` so `FROM deliveries`, `FROM cities`, etc. resolve.

ALTER FUNCTION public._summary_range(text)                              SET search_path = public, pg_catalog;
ALTER FUNCTION public.create_city(text)                                 SET search_path = public, pg_catalog;
ALTER FUNCTION public.create_district(uuid, text)                       SET search_path = public, pg_catalog;
ALTER FUNCTION public.create_branch(uuid, text, numeric, boolean)       SET search_path = public, pg_catalog;
ALTER FUNCTION public.set_city_active(uuid, boolean)                    SET search_path = public, pg_catalog;
ALTER FUNCTION public.set_district_active(uuid, boolean)                SET search_path = public, pg_catalog;
ALTER FUNCTION public.set_branch_active(uuid, boolean)                  SET search_path = public, pg_catalog;
ALTER FUNCTION public.set_opening_balances_locked(boolean)              SET search_path = public, pg_catalog;
ALTER FUNCTION public.list_cities_with_counts()                         SET search_path = public, pg_catalog;
ALTER FUNCTION public.list_districts_with_counts(uuid)                  SET search_path = public, pg_catalog;
ALTER FUNCTION public.list_branches_with_context(uuid)                  SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_opening_balances_locked()                     SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_branch_hub_details(uuid)                      SET search_path = public, pg_catalog;
ALTER FUNCTION public.report_kpis(text)                                 SET search_path = public, pg_catalog;
ALTER FUNCTION public.report_product_distribution(text, integer)       SET search_path = public, pg_catalog;
ALTER FUNCTION public.report_branch_distribution(text, integer)        SET search_path = public, pg_catalog;
ALTER FUNCTION public.report_daily_series(text)                         SET search_path = public, pg_catalog;
ALTER FUNCTION public.list_branch_movements(uuid, integer, integer)     SET search_path = public, pg_catalog;
-- Fix: same hardening pattern as 20240101000010_phase6_fix_search_path.sql,
-- extended to Phase 6 Branch Hub Tab RPCs (PR-6.2).
ALTER FUNCTION public.list_branch_products_with_status(uuid)              SET search_path = public, pg_catalog;
ALTER FUNCTION public.set_branch_product_price_atomic(uuid, numeric, date) SET search_path = public, pg_catalog;
ALTER FUNCTION public.set_branch_product_active(uuid, boolean)            SET search_path = public, pg_catalog;
ALTER FUNCTION public.activate_branch_product(uuid, uuid, numeric, date) SET search_path = public, pg_catalog;
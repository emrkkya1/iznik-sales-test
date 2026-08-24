-- Fix: same hardening pattern as 20240101000010_phase6_fix_search_path.sql.
-- The original CREATE FUNCTION in 20240101000015 used SET search_path = '' which
-- made `is_admin()` (in public) unresolvable. Restore the standard search path
-- so admin checks and sibling functions resolve.
ALTER FUNCTION public.list_deliveries_with_payments(UUID, INT, INT)
  SET search_path = public, pg_catalog;
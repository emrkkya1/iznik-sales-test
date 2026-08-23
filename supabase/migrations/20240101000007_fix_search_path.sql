-- Fix: restore a resolvable search_path on SECURITY DEFINER functions.
--
-- The L1 hardening set `search_path = ''` but the function bodies reference
-- tables (users, deliveries, branch_products, ...) and sibling functions
-- (is_admin, get_effective_price, recalculate_branch_balance, log_audit)
-- unqualified. Under an empty search path those references cannot be resolved,
-- so the first call throws `function is_admin() does not exist`.
--
-- `public, pg_catalog` keeps the `$user` schema out of the search path (the
-- hardening's actual goal) while restoring name resolution.

ALTER FUNCTION public.is_admin() SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_effective_price(uuid, date) SET search_path = public, pg_catalog;
ALTER FUNCTION public.log_audit(text, text, uuid, jsonb, text) SET search_path = public, pg_catalog;
ALTER FUNCTION public.recalculate_branch_balance(uuid) SET search_path = public, pg_catalog;
ALTER FUNCTION public.create_delivery_atomic(uuid, jsonb, numeric, text, date, text) SET search_path = public, pg_catalog;
ALTER FUNCTION public.update_delivery_atomic(uuid, jsonb, date) SET search_path = public, pg_catalog;
ALTER FUNCTION public.soft_delete_delivery_atomic(uuid, text) SET search_path = public, pg_catalog;
ALTER FUNCTION public.record_manual_payment_atomic(uuid, numeric, text, date) SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_branch_balance(uuid) SET search_path = public, pg_catalog;
ALTER FUNCTION public.prevent_role_escalation() SET search_path = public, pg_catalog;

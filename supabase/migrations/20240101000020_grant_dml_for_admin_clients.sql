-- Integration helper: grant base DML on reference tables to `authenticated` so
-- the local-only integration test suite (and any admin clients used by the
-- production app) can insert/update/delete without going through SECURITY
-- DEFINER RPCs. Row-level security policies still gate every row, so this
-- does not weaken authorization.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.cities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.districts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.branches TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.branch_products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.branch_product_prices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.deliveries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.delivery_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.payments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.audit_logs TO authenticated;

-- ============================================
-- M13: RESTORE STAFF ACCESS TO get_branch_balance
-- ============================================
-- Phase 6 tightened get_branch_balance to admin-only, which broke the
-- staff delivery review (Phase 5 + roadmap 05 require showing the
-- previous balance to the staff member creating the delivery).
--
-- This matches the original Phase 3 design (20240101000003_functions.sql
-- "GET BRANCH BALANCE (for staff who can't access current_balance)")
-- and the explicit comment in 20240101000002_rls_policies.sql:139
-- ("Staff CANNOT access: branches.current_balance (use function instead)").
--
-- SECURITY DEFINER is preserved, so staff can read the value through
-- the function without direct RLS access to branches.current_balance.

CREATE OR REPLACE FUNCTION get_branch_balance(
  p_branch_id UUID
) RETURNS NUMERIC(12,2) AS $$
BEGIN
  RETURN (
    SELECT current_balance
    FROM branches
    WHERE id = p_branch_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

GRANT EXECUTE ON FUNCTION get_branch_balance(UUID) TO authenticated;

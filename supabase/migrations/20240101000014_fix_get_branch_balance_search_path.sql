-- ============================================
-- M14: FIX get_branch_balance search_path
-- ============================================
-- Migration 13 restored the body of get_branch_balance but kept
-- SET search_path = '' (the Phase 6 hardening pattern). With an
-- empty search_path the unqualified reference to `branches` raises
-- 42P01 "relation does not exist". Schema-qualify the read and keep
-- the secure search_path.

CREATE OR REPLACE FUNCTION get_branch_balance(
  p_branch_id UUID
) RETURNS NUMERIC(12,2) AS $$
BEGIN
  RETURN (
    SELECT current_balance
    FROM public.branches
    WHERE id = p_branch_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

GRANT EXECUTE ON FUNCTION get_branch_balance(UUID) TO authenticated;

-- Phase 2: RLS Policies
-- Enable Row Level Security on all tables

-- ============================================
-- ENABLE RLS
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_product_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ADMIN POLICIES (full access to all tables)
-- ============================================

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'admin' AND is_active = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin policies for all tables
CREATE POLICY admin_all_users ON users FOR ALL USING (is_admin());
CREATE POLICY admin_all_cities ON cities FOR ALL USING (is_admin());
CREATE POLICY admin_all_districts ON districts FOR ALL USING (is_admin());
CREATE POLICY admin_all_branches ON branches FOR ALL USING (is_admin());
CREATE POLICY admin_all_products ON products FOR ALL USING (is_admin());
CREATE POLICY admin_all_branch_products ON branch_products FOR ALL USING (is_admin());
CREATE POLICY admin_all_prices ON branch_product_prices FOR ALL USING (is_admin());
CREATE POLICY admin_all_deliveries ON deliveries FOR ALL USING (is_admin());
CREATE POLICY admin_all_delivery_items ON delivery_items FOR ALL USING (is_admin());
CREATE POLICY admin_all_payments ON payments FOR ALL USING (is_admin());
CREATE POLICY admin_all_audit_logs ON audit_logs FOR ALL USING (is_admin());

-- ============================================
-- STAFF POLICIES
-- ============================================

-- Staff can SELECT/UPDATE their own profile
CREATE POLICY staff_select_own_profile ON users 
  FOR SELECT TO authenticated 
  USING (id = auth.uid());

CREATE POLICY staff_update_own_profile ON users 
  FOR UPDATE TO authenticated 
  USING (id = auth.uid());

-- Staff can SELECT reference data (cities, districts, products)
CREATE POLICY staff_select_cities ON cities 
  FOR SELECT TO authenticated 
  USING (TRUE);

CREATE POLICY staff_select_districts ON districts 
  FOR SELECT TO authenticated 
  USING (TRUE);

CREATE POLICY staff_select_active_branches ON branches 
  FOR SELECT TO authenticated 
  USING (is_active = TRUE);

CREATE POLICY staff_select_products ON products 
  FOR SELECT TO authenticated 
  USING (TRUE);

CREATE POLICY staff_select_branch_products ON branch_products 
  FOR SELECT TO authenticated 
  USING (TRUE);

CREATE POLICY staff_select_prices ON branch_product_prices 
  FOR SELECT TO authenticated 
  USING (TRUE);

-- Staff can SELECT own deliveries (today only, Istanbul timezone)
CREATE POLICY staff_select_own_deliveries ON deliveries 
  FOR SELECT TO authenticated 
  USING (
    user_id = auth.uid() 
    AND date = (NOW() AT TIME ZONE 'Europe/Istanbul')::DATE
    AND deleted_at IS NULL
  );

-- Staff can INSERT own deliveries
CREATE POLICY staff_insert_own_deliveries ON deliveries 
  FOR INSERT TO authenticated 
  WITH CHECK (user_id = auth.uid());

-- Staff can UPDATE own deliveries (before 23:59 Istanbul)
CREATE POLICY staff_update_own_deliveries ON deliveries 
  FOR UPDATE TO authenticated 
  USING (
    user_id = auth.uid()
    AND deleted_at IS NULL
    AND (NOW() AT TIME ZONE 'Europe/Istanbul')::TIME < '23:59:00'
  );

-- Staff can SELECT delivery_items for own deliveries
CREATE POLICY staff_select_own_delivery_items ON delivery_items 
  FOR SELECT TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM deliveries 
      WHERE id = delivery_items.delivery_id 
      AND user_id = auth.uid()
    )
  );

-- Staff can INSERT delivery_items for own deliveries
CREATE POLICY staff_insert_own_delivery_items ON delivery_items 
  FOR INSERT TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM deliveries 
      WHERE id = delivery_items.delivery_id 
      AND user_id = auth.uid()
    )
  );

-- Staff can SELECT own payments (field collections only)
CREATE POLICY staff_select_own_payments ON payments 
  FOR SELECT TO authenticated 
  USING (
    user_id = auth.uid()
    AND payment_type = 'field_collection'
    AND deleted_at IS NULL
  );

-- Staff CANNOT access:
-- - branches.current_balance (use function instead)
-- - payments for other users
-- - audit_logs
-- - other users' records

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER branches_updated_at BEFORE UPDATE ON branches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER deliveries_updated_at BEFORE UPDATE ON deliveries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

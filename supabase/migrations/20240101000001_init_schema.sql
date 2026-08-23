-- Phase 2: Database Schema Initialization
-- 11 tables for Tarihi İznik Fırını Sales Application

-- Required for the EXCLUDE (gist) constraint on uuid equality below.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============================================
-- 1. USERS (linked to Supabase Auth)
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'staff')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_username ON users(username);

-- ============================================
-- 2. CITIES
-- ============================================
CREATE TABLE cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. DISTRICTS
-- ============================================
CREATE TABLE districts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID REFERENCES cities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(city_id, name)
);

CREATE INDEX idx_districts_city ON districts(city_id);

-- ============================================
-- 4. BRANCHES
-- ============================================
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id UUID REFERENCES districts(id),
  name TEXT NOT NULL,
  current_balance NUMERIC(12,2) DEFAULT 0,  -- negative = credit
  opening_balance NUMERIC(12,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_branches_district ON branches(district_id);
CREATE INDEX idx_branches_active ON branches(is_active);

-- ============================================
-- 5. PRODUCTS
-- ============================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_active ON products(is_active);

-- ============================================
-- 6. BRANCH_PRODUCTS
-- ============================================
CREATE TABLE branch_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(branch_id, product_id)
);

CREATE INDEX idx_branch_products_branch ON branch_products(branch_id);
CREATE INDEX idx_branch_products_product ON branch_products(product_id);
CREATE INDEX idx_branch_products_active ON branch_products(is_active);

-- ============================================
-- 7. BRANCH_PRODUCT_PRICES (SCD Type 2)
-- ============================================
CREATE TABLE branch_product_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_product_id UUID REFERENCES branch_products(id) ON DELETE CASCADE,
  price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  start_date DATE NOT NULL,
  end_date DATE,  -- NULL = active
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT no_overlapping_prices EXCLUDE USING gist (
    branch_product_id WITH =,
    daterange(start_date, end_date, '[]') WITH &&
  )
);

CREATE INDEX idx_branch_product_prices_lookup 
  ON branch_product_prices(branch_product_id, start_date DESC);
CREATE INDEX idx_branch_product_prices_active 
  ON branch_product_prices(branch_product_id) WHERE end_date IS NULL;

-- ============================================
-- 8. DELIVERIES
-- ============================================
CREATE TABLE deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES branches(id),
  user_id UUID REFERENCES users(id),
  total_sales_amount NUMERIC(12,2) NOT NULL,  -- can be negative
  date DATE NOT NULL,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id),
  deletion_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_deliveries_branch_date ON deliveries(branch_id, date);
CREATE INDEX idx_deliveries_user_date ON deliveries(user_id, date);
CREATE INDEX idx_deliveries_active ON deliveries(deleted_at) WHERE deleted_at IS NULL;

-- ============================================
-- 9. DELIVERY_ITEMS
-- ============================================
CREATE TABLE delivery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID REFERENCES deliveries(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  delivered_quantity NUMERIC(12,2) NOT NULL CHECK (delivered_quantity >= 0),
  returned_quantity NUMERIC(12,2) NOT NULL CHECK (returned_quantity >= 0),
  net_quantity NUMERIC(12,2) GENERATED ALWAYS AS (delivered_quantity - returned_quantity) STORED,
  unit_price NUMERIC(12,2) NOT NULL,  -- price snapshot
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_delivery_items_delivery ON delivery_items(delivery_id);
CREATE INDEX idx_delivery_items_product ON delivery_items(product_id);

-- ============================================
-- 10. PAYMENTS
-- ============================================
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES branches(id),
  user_id UUID REFERENCES users(id),
  delivery_id UUID REFERENCES deliveries(id),  -- NULL for EFT
  amount NUMERIC(12,2) NOT NULL,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('field_collection', 'bank_transfer')),
  date DATE NOT NULL,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id),
  deletion_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_branch_date ON payments(branch_id, date);
CREATE INDEX idx_payments_delivery ON payments(delivery_id);
CREATE INDEX idx_payments_active ON payments(deleted_at) WHERE deleted_at IS NULL;

-- ============================================
-- 11. AUDIT_LOGS
-- ============================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type TEXT NOT NULL,  -- INSERT, UPDATE, DELETE
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  user_id UUID REFERENCES users(id),
  old_data JSONB,
  deletion_reason TEXT,  -- for DELETE operations
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

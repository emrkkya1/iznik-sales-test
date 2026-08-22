-- Seed: Branch-Product Assignments
-- Link all products to all branches initially

INSERT INTO branch_products (branch_id, product_id, is_active)
SELECT b.id, p.id, TRUE
FROM branches b
CROSS JOIN products p;

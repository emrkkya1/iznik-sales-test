# Seed Data

Apply in order:

1. `001_products.sql` - 16 reference products
2. `002_locations.sql` - 8 cities, 8 districts, 80+ branches
3. `003_branch_products.sql` - Link all products to all branches
4. `004_prices.sql` - Initial prices (same for all branches)

## Quick Apply

Use the helper script:

```bash
npm run db:seed
```

## Manual Apply

```bash
supabase db execute --file supabase/seed-data/001_products.sql
supabase db execute --file supabase/seed-data/002_locations.sql
supabase db execute --file supabase/seed-data/003_branch_products.sql
supabase db execute --file supabase/seed-data/004_prices.sql
```

## Notes

- All branches start with `current_balance = 0` and `opening_balance = 0`
- All branch-products start as `is_active = TRUE`
- Prices are set to today's date with `end_date = NULL` (active)
- Product names are in Turkish as they will appear in the app

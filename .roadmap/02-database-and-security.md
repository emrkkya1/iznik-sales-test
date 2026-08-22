# Phase 2: Database And Security

## Goal

Create the Supabase schema, database invariants, initial reference data, and RLS policies before adding product screens.

## Schema Plan

Implement timestamped migrations and generated TypeScript types for the eleven SRS v2 tables:

- `users` profile linked one-to-one with `auth.users`: full name, username, role (`admin` or `staff`), active flag.
- `cities`, `districts`, and `branches`: normalized geography and active branch records with opening balance and current balance.
- `products`, `branch_products`, and `branch_product_prices`: product catalog, branch availability, and SCD Type 2 price history.
- `deliveries` and `delivery_items`: receipt header and immutable price snapshots for delivery/return lines.
- `payments`: receipt-linked field collections and standalone manual payments.
- `audit_logs`: append-only actor, operation, entity, prior value JSON, timestamp, and deletion reason where applicable.

Use UUID primary keys, `created_at`/`updated_at` timestamps where appropriate, foreign keys, check constraints for non-negative delivery and return quantities, and indexes for geographical lookup, effective price lookup, date reporting, receipt ownership, and branch ledgers.

## Financial Integrity

- Store `price`, `amount`, and balances using a single precise monetary convention. Prefer `numeric(12,2)` for PostgreSQL and format values only at the edge.
- `delivery_items.net_quantity` is derived or verified as `delivered_quantity - returned_quantity`; it may be negative.
- Enforce one open-ended price period per `branch_product` and prohibit overlapping effective date ranges.
- A branch product must be active and priced for the receipt date before it can be used.
- Use a transaction-safe mechanism, not a mobile update, to maintain `branches.current_balance` after delivery, payment, edit, restore, or deletion.
- Soft-delete financial records with `deleted_at`, `deleted_by`, and a required deletion reason. Deleted records do not participate in active totals.

## Identity And Authorization

- Use Supabase Auth for credentials. Do not retain a custom `password_hash` in public application tables; the profile table supplies business identity and role.
- Create profile rows safely on user provisioning and prevent self-assigned role escalation.
- RLS: admins may access all operational data; staff may select their own active delivery receipts and items only, and may insert permitted new entries.
- Do not grant staff direct access to branches, balances, payments, audit logs, reports, or other users beyond the minimum reference data needed for entry.
- Enforce the staff same-day edit deadline in database policy/RPC logic using `Europe/Istanbul`, never solely in the client clock.
- Limit audit log mutation to trusted database triggers/functions and admin read access.

## Seed Data

- Add idempotent seed data for the 16 reference products and the cities, districts, and branches listed in the SRS.
- Apply reference prices as initial effective branch prices only after confirming which products each branch sells. Preserve the stated special product selections.
- Seed no real credentials, balances, payments, or production personal data.
- Mark the Izmit-area district assignments as pending customer confirmation rather than inventing locations.

## Verification

- `supabase db reset` reconstructs schema and development seed data from the repository.
- Generated `database.types.ts` replaces the hand-written one-table type.
- Migration tests prove RLS denies cross-staff access and staff access to protected balances.
- Constraint tests cover overlapping prices, unavailable/unpriced products, negative input quantities, and valid negative net quantities.
- **CI Enhancement:** Add migration validation job to `.github/workflows/ci.yml` that runs `supabase db reset` and validates migrations can be applied cleanly.

## Exit Gate

The database can be recreated locally, its types are generated, and direct client requests cannot violate role or accounting boundaries.

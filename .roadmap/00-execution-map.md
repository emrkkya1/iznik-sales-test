# Execution Map

## Purpose

Build an online, landscape-only Android tablet application for Tarihi Iznik Firini to record deliveries, returns, collections, branch balances, and management reports. This roadmap follows SRS v2.0 as the source of truth when it conflicts with earlier material.

## Product Decisions Fixed by SRS v2

- The primary platform is Android tablet in landscape orientation. iOS and web are development conveniences unless separately approved for release.
- The application is online-only. A missing connection blocks business mutations; there is no offline queue in the initial product.
- A return may exceed the same-day delivered quantity because it can represent earlier products. Negative net quantities are valid and reduce the branch balance.
- A positive balance means the branch owes the bakery. A negative balance means the branch has credit.
- Staff can view and edit only their own records created today, until 23:59 Europe/Istanbul. They cannot delete records or access balances, aggregate reports, or other staff records.
- Admins have full access, can edit or soft-delete historical records, and can export deliberately bounded report ranges to XLSX.
- The daily summary email is sent at 08:00 Europe/Istanbul.

## Delivery Order

1. `01-foundation-and-delivery.md`
2. `02-database-and-security.md`
3. `03-domain-services-and-transaction-engine.md`
4. `04-authentication-and-application-shell.md`
5. `05-staff-delivery-workflow.md`
6. `06-admin-master-data-and-balance-operations.md`
7. `07-reporting-audit-and-exports.md`
8. `08-automation-quality-and-release.md`

## Architectural Boundaries

- `src/app`: Expo Router route composition and route guards only.
- `src/screens`: role-specific page composition; no direct Supabase calls.
- `src/components`: reusable presentational and domain UI components.
- `src/hooks`: query, mutation, form, and screen orchestration hooks.
- `src/services/contracts.ts`: domain-oriented repository interfaces.
- `src/services/supabase`: the current contract implementation; database calls and RPC mapping only.
- `src/store`: ephemeral UI/session state only. PostgreSQL is the source of truth for balances, prices, permissions, and transactions.
- `src/types`: generated database types plus small application/domain types.
- `src/utils`: pure formatting, date-range, validation helpers, and export helpers.

Do not introduce a second business-data cache, duplicate balance calculations in Zustand, or table-level CRUD from screens.

## Cross-Phase Acceptance Rules

- All money uses integer minor units or `numeric` values with a defined rounding rule; JavaScript floating-point values must never become the accounting source of truth.
- Every financial mutation is atomic, server-side, authenticated, authorized, and auditable.
- Historic delivery item prices are immutable snapshots. Price changes never rewrite previous receipts.
- Editing or soft-deleting a receipt recalculates affected balances from authoritative ledger data in the same transaction.
- RLS is the security boundary. Client role checks only improve navigation and usability.
- Dates and daily staff-edit cutoffs use `Europe/Istanbul`, while timestamps are stored as `timestamptz`.
- Every phase ends with lint, type-check, relevant automated tests, and a tablet landscape smoke test.

## Out of Scope Until Approved

- Offline entry, synchronization, and conflict handling.
- iOS/web production support.
- PDF export, inventory/production tracking, route planning, and payment-provider integrations.
- A separate custom backend while the Supabase repository implementation satisfies requirements.

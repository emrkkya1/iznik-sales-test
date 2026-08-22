# Phase 3: Domain Services And Transaction Engine

## Goal

Expose the financial workflow through small, typed repositories backed by atomic database operations.

## Work

- Expand service contracts by use case: session/profile, location catalog, branch catalog/pricing, delivery receipts, payments, reports, exports, and administration.
- Keep contracts in domain language. For example, expose `createDeliveryWithPayment`, `updateDelivery`, `softDeleteDelivery`, and `recordManualPayment` rather than generic multi-table CRUD methods.
- Implement the Supabase adapters under `src/services/supabase` and keep route/screens unaware of Supabase query syntax.
- Create database RPCs or stored procedures for all balance-affecting mutations. Each RPC must validate the authenticated actor, obtain effective historical prices, calculate totals, persist receipt/items/payment, update balance, and write audit data atomically.
- Treat a receipt as the idempotency boundary. Include a client-generated idempotency key or equivalent request guard so repeated taps/retries cannot create duplicate financial entries.
- Build a canonical ledger/query projection from non-deleted deliveries and payments. Define and test how `branches.current_balance` is recalculated after any historical change.
- Return a receipt summary containing locked unit prices, net quantities, required amount, paid amount, previous balance, and resulting balance for confirmation and history UI.
- Add application hooks for loading, mutation state, retry-safe errors, and post-mutation invalidation. Zustand contains session and small UI state only.

## Core Formulae

`net_quantity = delivered_quantity - returned_quantity`

`receipt_sales_total = sum(net_quantity * locked_unit_price)`

`new_balance = previous_balance + receipt_sales_total - collected_payment`

A negative `receipt_sales_total` or `new_balance` is valid. It represents return credit or branch credit, not an error.

## Verification

- Unit-test calculation and date helpers with Turkish locale/timezone edge cases.
- Integration-test RPCs for normal sale, prior-day return, overpayment, manual payment, price history, duplicate request retry, edit, and soft delete.
- Confirm a failed item/payment/audit write leaves no partial receipt or balance update.

## Exit Gate

The client has one safe mutation path for all financial changes and cannot calculate or alter authoritative balances itself.

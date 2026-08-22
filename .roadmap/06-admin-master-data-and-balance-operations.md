# Phase 6: Admin Master Data And Balance Operations

## Goal

Give administrators safe operational management for catalog data, prices, branch balances, historical corrections, and manual payments.

## Work

- Implement the admin navigation rail and dashboard entry points for Summary, Branches, Products/Pricing, Payments, Records, Users, and Settings as required by the approved scope.
- Create city, district, and branch management with active/passive states. Support inline “Add city” and “Add district” from the branch flow without bypassing validation or uniqueness rules.
- Create product management with image URL, active state, and clear protection for products referenced by historical receipts. Deactivation replaces destructive deletion.
- On a branch detail page, display product cards with active switches. Activating a product creates/uses its `branch_products` link and prompts for an effective price; it must not silently invent a price.
- Implement price changes as a single server transaction: close the previous effective period, create the new period, prevent overlaps, and preserve historical receipt prices.
- Provide initial-balance import/entry during controlled go-live only. Record it as a traceable, audited opening-balance operation and prohibit casual overwrites after launch.
- Implement current balance lists by city/district/branch, clearly distinguish debt from credit, and expose chronological receipt/payment movements to admins.
- Add admin-only manual payment for EFT/havale or other non-field collections. It has no delivery link, requires amount/date/type/note, updates the ledger atomically, and is audited.
- Build historical receipt detail/edit/soft-delete flows with mandatory delete reason, previous/new summary, and success invalidation of balance/report data.
- Implement user lifecycle management: provision or invite users using secure Auth administration from a trusted server-side function, assign profile role, and deactivate accounts without deleting history.

## Verification

- Price changes select the right value for backdated and future receipts.
- Editing/deleting a historic receipt or adding manual payment changes balances and reports consistently.
- A staff account cannot invoke any admin operation even if it constructs the request manually.

## Exit Gate

Admins can maintain operational master data and correct financial history without corrupting prices, balances, or auditability.

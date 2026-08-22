# Phase 5: Staff Delivery Workflow

## Goal

Deliver the fast, checkout-style staff workflow for recording a branch delivery, returns, and field collection.

## Work

- Implement the three-stage branch selector as horizontal scrollable chips: city, district, then branch. Reset dependent selections when a parent changes; enable the large confirmation button only when the complete path is valid.
- Fetch only active branch products with a valid effective price for the selected receipt date. Do not show unavailable products or silently substitute reference prices.
- Build image/name product cards in a responsive landscape grid. Each card has separate delivered and returned quantity controls, large minus/plus targets, direct numeric editing, validation, and a clear zero state.
- Default the receipt date to today in `Europe/Istanbul`. Allow backdated entry only if staff permission is explicitly granted; otherwise show the date as read-only. Record the actual creation timestamp separately.
- Present a live review: selected branch, compact product summary, locked effective prices, net quantities, required amount, payment received, previous balance, and resulting debt/credit. The displayed totals are previews; server results are final.
- Submit through the Phase 3 idempotent transaction, disable duplicate submission, then show a success receipt and clear the draft only after success.
- Add the left-side history drawer listing only the signed-in staff member's receipts created today. Permit edit only until the database-enforced 23:59 deadline. Use the same transaction path for edits and show an audit-aware confirmation.
- Explicitly block delete, historical balance views, global dashboards, other staff records, and manual EFT/bank payments for staff.
- Require online status before entry or save. Show a Turkish reconnect/retry state; do not imply unsaved offline work will synchronize later.

## Verification

- Test the full path with zero returns, prior-day returns greater than delivery, partial payment, and branch overpayment.
- Test staff visibility boundaries and edit cutoff using server timezone rather than a changed device clock.
- Perform touch smoke tests with real tablet landscape dimensions and the Android numeric keyboard.

## Exit Gate

A staff member can quickly create and correct only an authorized same-day receipt without being able to access protected financial information.

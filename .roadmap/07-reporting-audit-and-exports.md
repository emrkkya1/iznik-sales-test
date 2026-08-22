# Phase 7: Reporting, Audit, And Exports

## Goal

Provide accurate, bounded management insights and traceability without creating duplicate financial truth.

## Work

- Define server-side report queries/views from active ledger data. Do not use dashboard caches as accounting inputs.
- Implement dashboard metrics for selected range: delivered quantity, returned quantity, net quantity, return rate, required sales amount, collected payment, and outstanding/credit balance.
- Support scope filters for whole business, city, district, branch, and product. Use period presets Today, This Week, This Month, This Year, plus explicitly bounded custom ranges.
- Calculate `return_rate = returned_quantity / delivered_quantity * 100`; show “No data” when delivered quantity is zero.
- Add branch statement/detail reports covering cumulative deliveries, returns, net sales, return rate, sales total, payments, and current balance by product.
- Build a filterable admin records screen with receipt, location, product, actor, and date filters; show a right-side detail drawer and soft-deleted/audit state where authorized.
- Build XLSX exports with the existing SheetJS/FileSystem/Sharing tools for limited ranges only. Add a maximum range/row policy, clear column names, Turkish number/date formatting, generated-at metadata, and a warning that device sharing can expose financial data.
- Use temporary cache files and delete them after sharing where the Expo API permits. Never include auth tokens or hidden audit payloads in exported workbooks.
- Add admin audit-log views for actor, action, entity, before-state metadata, timestamp, and deletion reason. Audit records remain immutable.

## Verification

- Reconcile report totals against known receipt/payment fixtures, including negative net sales and credit balances.
- Open exported XLSX files on Android and desktop spreadsheet tools; validate encoding, Turkish characters, money formats, and filter-bound data.
- Ensure staff cannot query reports, exports, or audit data through UI or direct API calls.

## Exit Gate

Administrators can inspect and export reliable, authorized reports whose totals reconcile with the transaction engine.

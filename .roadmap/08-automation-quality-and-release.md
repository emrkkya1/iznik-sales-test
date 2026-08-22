# Phase 8: Automation, Quality, And Release

## Goal

Operate the system safely in production with scheduled reporting, observability, recovery procedures, and Android release validation.

## Email Automation

- Implement a protected server-side endpoint or Supabase Edge Function that composes the prior/appropriate reporting-period summary using server-authorized queries.
- Configure cron-job.org to invoke it daily at 08:00 `Europe/Istanbul`. Store the schedule secret only in cron and server-side secrets, validate it, and make the job idempotent per report date.
- Use Resend only from the server-side function. Initial recipient is `osmankamilcil@gmail.com`; admin-managed recipients and schedule settings require persisted configuration, validation, and audit logging.
- Persist report-send outcomes, recipient set, attempted/sent timestamps, error category, and retry eligibility. Admins can inspect failures and manually retry without sending duplicates accidentally.

## Quality And Security

- Add automated coverage for accounting invariants, RPC authorization, RLS policies, report aggregates, staff edit deadline, XLSX output, and scheduled email idempotency.
- Run end-to-end Android smoke flows: login, staff receipt, same-day correction, admin price update, manual payment, historical correction, report export, and email retry.
- Validate on the agreed Android tablet sizes in locked landscape, including rotation attempts, keyboard interaction, slow network, timeout, and retry behavior.
- Add structured server-side error logging and minimal client crash/error reporting only after obtaining operational/privacy approval. Never log passwords, access tokens, full sensitive exports, or raw payment notes unnecessarily.
- Define backup/restore ownership for Supabase, migration rollback procedures, secret rotation, user offboarding, and incident response.
- Review dependency health and upgrade constraints from Phase 1 rather than blindly upgrading NativeWind preview or pinned transitive packages.

## Release

- Configure EAS/development and production builds, Android application signing, versioning, environment separation, and a release checklist.
- Require production migration review, seed exclusion, RLS verification, secret verification, and backup confirmation before first live use.
- Execute a controlled go-live: import approved opening balances, reconcile them against the existing ledger, obtain customer sign-off, then lock the import path.
- Train staff on online-only behavior and same-day corrections; train admins on historical edits, deletions, price history, credit balances, exports, and failed email recovery.

## Exit Gate

The Android application, database, automated email report, operational procedures, and production controls have passed acceptance testing and are ready for controlled launch.

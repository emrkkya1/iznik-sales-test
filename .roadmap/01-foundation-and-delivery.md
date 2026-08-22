# Phase 1: Foundation And Delivery

## Goal

Turn the starter skeleton into a documented, repeatable Expo 57 project that can safely support the domain phases.

## Prerequisites

- Confirm the supported Android tablet models and minimum Android version with the customer.
- Confirm production ownership for Supabase, Resend, cron-job.org, and Android signing credentials.
- Consult the exact Expo SDK 57 documentation required by `AGENTS.md` before native configuration changes.

## Work

- Replace the generic README with local setup, environment variables, Supabase workflow, architecture, scripts, and Android-tablet run instructions.
- Keep `app.json` landscape-locked and set Android-first release metadata. Document that iOS/web are not release targets in this scope.
- Validate the installed Expo, React Native, NativeWind preview, Gluestack, SheetJS, FileSystem, and Sharing versions as a compatible set. Investigate and document the reason for `legacy-peer-deps` and the `lightningcss` pin before changing either.
- Add explicit scripts for linting, type-checking, database type generation, local Supabase start/reset, and test execution.
- Add a test runner for pure domain logic and repository mapping. Add one route-level or component test harness appropriate for Expo 57.
- Add CI for clean install, lint, type-check, tests, and migration validation. Do not place Supabase service-role keys or Resend secrets in the mobile application or CI logs.
- Establish typed environment validation. Only `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` belong in the client; validate them at startup with a clear configuration error.
- Add a minimal error boundary and a centralized, Turkish user-message mapping for network, authorization, validation, and unknown failures.

## Verification

- A fresh clone can run the documented checks and launch on an Android landscape emulator/tablet.
- Missing or placeholder public Supabase configuration produces an understandable non-sensitive error.
- CI executes without relying on the current local `.env`, cache, or untracked files.

## Exit Gate

The repository is reproducible, documented, and validated before schema or feature work begins.

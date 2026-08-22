# Phase 4: Authentication And Application Shell

## Goal

Implement secure sign-in, session restoration, protected role routing, and the shared tablet shell.

## Work

- Build a Turkish sign-in screen using the existing Supabase Auth adapter. Show loading, invalid credentials, disabled account, and connection errors without exposing internals.
- Restore sessions on launch and subscribe to `onAuthStateChange` so token refresh, sign-out, and expired sessions cannot leave the Zustand store stale.
- Fetch the active profile after authentication. An inactive profile is signed out and shown a support message.
- Add protected Expo Router groups for authentication, staff, and admin. Route guards improve UX but are backed by Phase 2 RLS.
- Build the landscape tablet frame: appropriate safe areas, large touch targets, keyboard-safe fields, and visible signed-in user/logout control.
- Provide a staff shell with the required accessible history entry point and an admin shell with a persistent navigation rail.
- Define shared empty, loading, error, retry, confirmation, amount, date, and destructive-action primitives. Follow the current Gluestack/NativeWind patterns rather than adding a second design system.
- Keep all customer-facing UI text in Turkish. English remains the language for code, roadmap, database identifiers, and developer documentation.

## Verification

- Authenticated and unauthenticated deep links resolve to the correct route group.
- Role changes and token expiration take effect without an application restart.
- Primary shells remain usable at supported tablet dimensions in landscape, with large touch targets and no clipped navigation.

## Exit Gate

Only authenticated active users can reach role-appropriate routes, and each role has a stable landscape navigation base.

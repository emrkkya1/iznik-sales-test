# Tarihi İznik Fırını Sales Application

Android tablet application (landscape orientation) for Tarihi İznik Firini bakery to record deliveries, returns, collections, branch balances, and management reports.

## Prerequisites

- **Node.js 20+** and npm
- **Android Studio** with Android SDK (API 24+) or physical Android tablet
- **Supabase CLI** (`npm install -g supabase`)
- **Docker Desktop** (for local Supabase development)

## Environment Setup

Create a `.env` file in the project root:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Note:** Only `EXPO_PUBLIC_*` variables are exposed to the client. Never commit secrets or service-role keys.

## Local Development

### 1. Install dependencies

```bash
npm install
```

**Why `legacy-peer-deps`?** NativeWind v5 preview has peer dependency conflicts with React 19. Using `legacy-peer-deps` avoids these until NativeWind stabilizes.

**Why `lightningcss` pin?** NativeWind v5 requires a specific lightningcss version. The pin in `overrides`/`resolutions` prevents version conflicts.

### 2. Start local Supabase

```bash
npm run db:start
```

This starts Supabase locally with Docker. The first run downloads required images.

### 3. Reset database (apply migrations + seed)

```bash
npm run db:reset
```

### 4. Generate TypeScript types from database

```bash
npm run db:types
```

This generates `src/types/database.types.ts` from your local Supabase schema.

### 5. Start the app

```bash
npm start
```

Then choose your platform:
- **Android emulator**: Press `a` or run `npm run android`
- **Physical device**: Scan QR code with Expo Go app
- **Web**: Press `w` or run `npm run web` (development convenience only)

## Dev Seed Users

`supabase db reset` seeds two placeholder accounts (see `supabase/seed-data/005_auth_users.sql`). Replace these with real users before go-live.

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@iznik.test` | `admin123` |
| Staff | `staff@iznik.test` | `staff123` |

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start Expo dev server |
| `npm run android` | Start on Android emulator |
| `npm run ios` | Start on iOS simulator (dev only) |
| `npm run web` | Start web app (dev only) |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | TypeScript type checking |
| `npm test` | Run tests once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run db:start` | Start local Supabase |
| `npm run db:reset` | Reset local database |
| `npm run db:types` | Generate TypeScript types |

## Architecture

```
src/
├── app/              # Expo Router routes and route guards
├── screens/          # Role-specific page composition (auth, staff, admin)
├── components/       # Reusable UI components (ui/, domain/)
├── hooks/            # Query, mutation, form, and screen orchestration
├── services/
│   ├── contracts.ts  # Domain-oriented repository interfaces
│   └── supabase/     # Supabase adapter implementation
├── store/            # Ephemeral UI/session state (Zustand)
├── types/            # Generated database types + domain types
├── utils/            # Formatting, validation, export helpers
└── config/           # Environment validation (Zod)
```

**Key principles:**
- PostgreSQL is the source of truth for balances, prices, permissions, and transactions
- No business-data cache in Zustand
- Screens never call Supabase directly
- All financial mutations are atomic, server-side, authenticated, authorized, and auditable

## Testing

```bash
npm test              # Run tests once
npm run test:watch    # Run tests in watch mode
```

Tests use Vitest with happy-dom environment. Example tests are in `src/utils/__tests__/`.

## CI/CD

GitHub Actions runs on every push to `main` and on PRs:
- Lint
- Typecheck
- Test

See `.github/workflows/ci.yml`.

## Platform Support

**Primary target:** Android tablet in landscape orientation

iOS and web are development conveniences only. They are not release targets in the current scope.

## Documentation

- [Roadmap](.roadmap/) - 8-phase implementation plan
- [AGENTS.md](AGENTS.md) - AI agent instructions
- [Expo SDK 57 docs](https://docs.expo.dev/versions/v57.0.0/) - Framework reference

## License

See [LICENSE](LICENSE) file.

# Phase 5 — Staff Delivery Workflow: Implementation Plan

> Source of truth for behavior: `.roadmap/05-staff-delivery-workflow.md` and SRS v2.0.
> This document is the engineering plan for the UI layer. The domain layer
> (services, hooks, idempotent transaction engine) was delivered in Phase 3 and
> is reused as-is except for the small `listMyDeliveries` date scoping noted
> below.

## Goals

Deliver the fast, checkout-style staff workflow for recording a branch delivery,
returns, and field collection — built on clean, reusable UI primitives.

## Branch

- Base: `main` (already fast-forwarded to `origin/main`, includes the
  gluestack-ui v5 redesign via PR #9).
- Working branch: `phase-5-staff-delivery-workflow`.

---

## 1. UI Primitives

All primitives live in `src/components/ui/<name>/`, follow the existing
gluestack-ui v5 / tva pattern (`button`, `input`, etc.), and use **semantic
tokens only** (`bg-primary`, `text-muted-foreground`, `border-border`, …).
No numbered colors, no inline hex, no `typography-*`/`neutral-*` tokens.

Critical layout rule (from `AGENTS.md`): critical flex containers use inline
`style={{ flex: 1 }}`, **not** `className="flex-1"`, because NativeWind v5 does
not translate `flex-1` reliably on Android.

### 1.1 `Picker` — horizontal center-focus selector

Replaces the chip idea. A horizontal, scrollable, snap-to-center selector.

**Props**

```ts
type PickerItem = { id: string; label: string; disabled?: boolean };

type PickerProps = {
  items: PickerItem[];
  value: string | null;
  onChange: (id: string) => void;
  placeholder?: string;   // shown when empty / nothing selected
  label?: string;         // optional header ("Şehir" / "İlçe" / "Şube")
  itemWidth?: number;     // default 120
  loading?: boolean;
  disabled?: boolean;     // e.g. child picker before parent is selected
};
```

**Visual**

- Horizontal `ScrollView`, `showsHorizontalScrollIndicator={false}`,
  `decelerationRate="fast"`, `snapToInterval={itemWidth}`.
- `contentContainerStyle.paddingHorizontal = (containerWidth - itemWidth) / 2`
  (measured via `onLayout`), so the first and last items can reach center with
  empty space on the outer edge.
- Each item: `Pressable`, `width={itemWidth}`, centered text, with a thin
  **vertical divider** (`border-r border-border`) between neighbors (last item
  has no right border).
- Center (selected) item highlighted: `bg-primary text-primary-foreground`
  (font-heading). Off-center items: `text-muted-foreground`.
- Disabled items: reduced opacity + non-tappable.

**Behavior**

- On `onMomentumScrollEnd`: `index = Math.round(scrollX / itemWidth)`, clamped,
  committed via `onChange`.
- Tap on a visible item: `scrollTo({ x: index * itemWidth, animated: true })`;
  the momentum-end handler then commits the selection.
- Programmatic `value` changes also re-center the scroll.
- Empty `items` → render `placeholder` centered.

**Usage:** three stacked rows (City → District → Branch). Parent change resets
child `value`; child is `disabled` until parent selected.

### 1.2 `QuantityStepper`

**Props**

```ts
type QuantityStepperProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;      // default 0
  max?: number;      // default 9999
  step?: number;     // default 1
  disabled?: boolean;
  label?: string;    // e.g. "Teslim"
};
```

**Visual**

- Row: `[−] [value field] [+]`.
- `−`/`+` buttons: minimum `44×44` touch target, `variant="outline"`, large icon.
- Value field: `Input` with `keyboardType="numeric"`, `enterKeyHint="done"`,
  tappable for direct editing.
- On blur/submit: parse, clamp to `[min, max]`, call `onChange`.
- `−` disabled when `value <= min`; `+` disabled when `value >= max`.
- Non-numeric/empty input reverts to the previous value.

### 1.3 `ProductCard` (domain)

**Props**

```ts
type ProductCardProps = {
  productId: string;
  name: string;
  imageUrl: string | null;
  quantity: number;             // delivered only (returns deferred)
  onQuantityChange: (q: number) => void;
  price: number;                // locked; cosmetic
};
```

**Enable/disable**

- Disabled when `quantity === 0`: card at `opacity-40`, stepper hidden (show a
  `+` affordance). Tapping the card body (or `+`) enables it and sets quantity
  to 1. Decrementing to 0 (or typing 0) disables it again. Quantity is the toggle.

**Visual**

- `Pressable` card (image top via `expo-image` + name + price + stepper) in a
  responsive landscape grid (~4 columns).

### 1.4 `NetworkBanner`

- Top banner shown **only** when offline (slides in/out), mounted once in the
  shell. Turkish: "Bağlantı yok. Kayıt için internet gerekli."

### 1.5 `MutationButton`

- Thin wrapper over `Button` that auto-applies `disabled` when offline (reads
  the connectivity store). Used at every mutation call site so offline logic is
  centralized (no `disabled={!isOnline}` sprinkled across screens).

### 1.6 Other primitives

- `DateField` — defaults to `getIstanbulToday()`, editable for everyone (per
  decision: no read-only gate for backdating this phase), formatted via
  `formatDateForDisplay()`.
- `Amount` — TRY display, signed, debt/credit coloring.
- `Sheet` — left-side drawer for history (reanimated overlay + pan).
- `ResultState` — success receipt screen after submit.

---

## 2. Connectivity foundation

- Add `@react-native-community/netinfo`.
- `src/store/connectivity.ts` — Zustand slice `{ isOnline, setOnline }`.
- `src/hooks/useOnlineStatus.ts` — subscribes to `NetInfo.addEventListener`,
  syncs the store.

---

## 3. Shell redesign (`StaffShell`)

- Slim top bar: brand mark (left) + current date badge (center) + user
  avatar/initial (right, tappable).
- Sign-out behind the user avatar tap → `ConfirmDialog` (no persistent
  "Çıkış" button).
- Bottom nav stays (`Ana Sayfa` / `Geçmiş`).
- `NetworkBanner` rendered under the top bar, visible only when offline.

---

## 4. Domain components (`src/components/domain/`)

- `BranchSelector` — three stacked `Picker` rows; parent change resets children.
- `ProductCard` — spec above.
- `CheckoutSummary` — live review: branch, items, locked prices, net quantities,
  required amount, payment received, previous balance (via
  `ledger.getBranchBalance`), resulting debt/credit. Labeled as preview; server
  `ReceiptSummary` is final.
- `PaymentReceivedInput` — numeric, `field_collection` only (bank is admin-only).
- `HistoryList` / `HistoryItem` — today's receipts inside the left `Sheet`.

---

## 5. Draft state (`src/store/receiptDraft.ts`)

Zustand ephemeral slice (ephemeral UI state only — no balance math):

```ts
{
  cityId, districtId, branchId,
  date,                                    // YYYY-MM-DD, default getIstanbulToday()
  quantities: Record<productId, number>,   // delivered only
  paymentAmount,
  isSubmitting,
  // actions
  setPath, setDate, setQuantity, setPayment, setSubmitting, reset
}
```

`reset()` fires only after successful `createDelivery`. `useCreateDelivery`
already resets its idempotency key on success.

---

## 6. Screens & routes

- `StaffHomeScreen` → BranchSelector → DateField → ProductGrid → CheckoutSummary
  → PaymentReceivedInput → MutationButton submit → ResultState. Duplicate
  submission disabled via `isSubmitting`.
- `StaffHistoryScreen` → HistoryList inside a Sheet, reachable from bottom nav.
- Routes `(staff)/home.tsx` / `history.tsx` unchanged (mount the screens).

---

## 7. Service tweak

- `listMyDeliveries()` currently returns all of the user's receipts. Scope it to
  today (`.eq('date', getIstanbulToday())`) so staff never fetch own historical
  rows — honors the exit gate. Small change to `DeliveryRepository` contract +
  `src/services/supabase/deliveries.ts`.

---

## 8. Verification

- `npm run lint`, `npm run typecheck`, `npm run test`.
- Vitest coverage: draft slice, quantity clamp, summary preview math, picker
  index computation.
- Tablet landscape smoke test: zero returns, prior-day returns > delivery
  (negative net), partial payment, branch overpayment; edit cutoff via server
  clock (not device).

## Out of scope (this phase)

- Returned quantities on product cards (deferred).
- Admin master data / balance operations (Phase 6).
- Offline queue/sync (explicitly out of scope — online-only).

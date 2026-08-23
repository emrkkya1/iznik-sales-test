# Phase 5 — Second Pass: Detailed Implementation Plan

> Follows the first-pass plan in `docs/phase-5-plan.md` and the roadmap
> `.roadmap/05-staff-delivery-workflow.md`. This pass is UI-only; the domain
> layer (services/hooks/store) is unchanged except where noted.

## Confirmed decisions

| # | Area | Decision |
|---|------|----------|
| 1 | Picker widths | **Variable-width measured entries** (each entry sizes to its text, capped). |
| 2 | Balance display | **Neutral signed amount + `Borç` / `Alacak` label** (remove red/blue). |
| 3 | Date picker | **Native** via `@expo/ui/community/datetime-picker` (Android dialog). |
| 4 | Stepper | Single unified `[−][value][+]` container, `w-full`. |
| 5 | ProductCard price | Small white chip overlaid top-left on the image. |
| 6 | Delivery flow | 3-phase wizard + `ProgressBar` + Geri/İleri. |

---

## 0. New pure helpers (unit-testable)

Extract logic that must be testable into pure modules with no JSX.

### `src/components/ui/picker/pickerUtils.ts` (new)

```ts
// Snap offsets so each item centers in a viewport of `containerWidth`.
// widths[i] = measured width of item i. Leading/trailing edge padding is
// implied by the offset formula (item 0 centers at scrollX 0; last item
// centers exactly at max scroll).
export function computeSnapOffsets(
  widths: number[],
  containerWidth: number,
): number[] {
  if (widths.length === 0 || containerWidth <= 0) return [];
  const padLeading = (containerWidth - widths[0]) / 2;
  const offsets: number[] = [];
  let left = padLeading;
  for (let i = 0; i < widths.length; i++) {
    offsets.push(left + widths[i] / 2 - containerWidth / 2);
    left += widths[i];
  }
  return offsets;
}

// Length-based font size so long names shrink.
export type PickerFontSize = 'md' | 'sm' | 'xs' | '2xs';

export function pickerFontSize(label: string): PickerFontSize {
  const len = label.length;
  if (len <= 12) return 'md';
  if (len <= 18) return 'sm';
  if (len <= 26) return 'xs';
  return '2xs';
}

// Nearest snap offset -> index (used in onMomentumScrollEnd).
export function snapIndexForOffset(
  offsets: number[],
  offsetX: number,
): number {
  if (offsets.length === 0) return -1;
  let best = 0;
  for (let i = 1; i < offsets.length; i++) {
    if (Math.abs(offsets[i] - offsetX) < Math.abs(offsets[best] - offsetX)) {
      best = i;
    }
  }
  return best;
}
```

### `src/utils/dates.ts` (add)

```ts
// YYYY-MM-DD <-> Date, using local calendar (device is Europe/Istanbul).
// Noon avoids any UTC day-shift when round-tripping through toISOString.
export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

export function formatIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
```

---

## 1. `Picker` rework (`src/components/ui/picker/index.tsx`)

### 1.1 What changes

- Variable-width items (measure each item via `onLayout`).
- 2-line wrap + length-based font shrink.
- Fix the **tap snap-back** bug.
- Vertical dividers preserved.

### 1.2 State / refs

```ts
const [containerWidth, setContainerWidth] = useState(0);
const [widths, setWidths] = useState<number[]>([]); // per-item measured widths
const lastTargetIndexRef = useRef<number | null>(null); // index we last scrolled toward
const initializedRef = useRef(false);
const scrollRef = useRef<ScrollView>(null);
```

Item measurement (indexed):

```ts
const handleItemLayout = (index: number) => (e: LayoutChangeEvent) => {
  const w = Math.ceil(e.nativeEvent.layout.width);
  setWidths((prev) => {
    if (prev[index] === w) return prev;
    const next = prev.slice();
    next[index] = w;
    return next;
  });
};
```

Reset when the item list changes identity (new district/branch lists):

```ts
useEffect(() => {
  setWidths([]);
  initializedRef.current = false;
  lastTargetIndexRef.current = null;
}, [items]);
```

### 1.3 Derived values

```ts
const allMeasured =
  containerWidth > 0 &&
  widths.length === items.length &&
  widths.every((w) => w > 0);

const snapOffsets = useMemo(
  () => (allMeasured ? computeSnapOffsets(widths, containerWidth) : []),
  [allMeasured, widths, containerWidth],
);

const selectedIndex = items.findIndex((i) => i.id === value);
```

### 1.4 Scroll-to-index (single source of truth)

```ts
const scrollToIndex = useCallback(
  (index: number) => {
    if (snapOffsets.length === 0) return; // not measured yet
    lastTargetIndexRef.current = index;
    scrollRef.current?.scrollTo({ x: snapOffsets[index], animated: true });
  },
  [snapOffsets],
);
```

### 1.5 Tap fix + scroll fix

```ts
// Tap: select immediately, then animate the tapped item to center.
// The momentum-end handler re-affirms the same index (idempotent).
const handlePress = useCallback(
  (index: number) => {
    if (disabled) return;
    const item = items[index];
    if (!item || item.disabled) return;
    scrollToIndex(index);
    onChange(item.id);
  },
  [disabled, items, onChange, scrollToIndex],
);

// Scroll-and-release: commit the item nearest the settled offset.
const handleScrollEnd = useCallback(
  (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = snapIndexForOffset(
      snapOffsets,
      e.nativeEvent.contentOffset.x,
    );
    if (index >= 0) {
      const item = items[index];
      if (item && !item.disabled) onChange(item.id);
    }
  },
  [snapOffsets, items, onChange],
);
```

The **guard** that fixes snap-back: the value-sync effect only auto-scrolls when
the incoming `selectedIndex` differs from `lastTargetIndexRef` (i.e. a *true*
external change such as reset/prefill), so a tap-commit never re-issues an
interrupting scroll:

```ts
// Initial center (once, after all widths are measured).
useEffect(() => {
  if (!allMeasured || initializedRef.current) return;
  initializedRef.current = true;
  const idx = selectedIndex >= 0 ? selectedIndex : 0;
  lastTargetIndexRef.current = idx;
  scrollRef.current?.scrollTo({ x: snapOffsets[idx], animated: false });
}, [allMeasured, snapOffsets, selectedIndex]);

// External value changes (parent reset / edit prefill).
useEffect(() => {
  if (!allMeasured) return;
  if (selectedIndex >= 0) {
    if (selectedIndex !== lastTargetIndexRef.current) scrollToIndex(selectedIndex);
  } else {
    lastTargetIndexRef.current = null;
    scrollRef.current?.scrollTo({ x: 0, animated: true });
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [selectedIndex, allMeasured]);
```

### 1.6 Render (item)

```tsx
<ScrollView
  ref={scrollRef}
  horizontal
  showsHorizontalScrollIndicator={false}
  decelerationRate="fast"
  snapToOffsets={snapOffsets.length ? snapOffsets : undefined}
  onLayout={handleContainerLayout}
  onMomentumScrollEnd={handleScrollEnd}
  contentContainerStyle={{ paddingHorizontal: allMeasured ? (containerWidth - widths[0]) / 2 : 0 }}
>
  {items.map((item, index) => {
    const selected = item.id === value;
    const isLast = index === items.length - 1;
    return (
      <Pressable
        key={item.id}
        onPress={() => handlePress(index)}
        onLayout={handleItemLayout(index)}
        disabled={item.disabled}
        className={`h-16 items-center justify-center border-r border-border px-3 ${
          isLast ? 'border-r-0' : ''
        } ${selected ? 'bg-primary' : 'bg-transparent'}`}
      >
        <Text
          size={pickerFontSize(item.label)}
          bold={selected}
          numberOfLines={2}
          className={`text-center ${
            selected ? 'text-primary-foreground' : 'text-muted-foreground'
          }`}
        >
          {item.label}
        </Text>
      </Pressable>
    );
  })}
</ScrollView>
```

### 1.7 Notes / edge cases

- Fixed row height `h-16` (64px) keeps all items even when some wrap to 2 lines.
- `snapToOffsets` is `undefined` until measured; during that brief window the
  list renders unsnapped (acceptable — lists are small).
- Divider stays `border-r border-border`; the 1px border is part of the measured
  width, so snap math is unaffected.
- `MAX_ITEM_WIDTH` cap: the `Text` gets `style={{ maxWidth: 280 }}` so an
  ultra-long name wraps rather than growing unbounded.

---

## 2. `QuantityStepper` redesign (`src/components/ui/stepper/index.tsx`)

Replace the three-element `HStack` (two 48px buttons + 72px input) with one
unified container that fills its parent width.

```tsx
<Box className="w-full flex-row items-stretch overflow-hidden rounded-lg border border-border bg-background">
  <Pressable
    onPress={decrement}
    disabled={disabled || value <= min}
    className={`h-11 w-11 items-center justify-center ${disabled || value <= min ? 'opacity-40' : ''}`}
  >
    <Icon as={MinusIcon} size="sm" className="text-foreground" />
  </Pressable>

  <TextInput
    value={text}
    onChangeText={setText}
    keyboardType="numeric"
    enterKeyHint="done"
    textAlign="center"
    selectTextOnFocus
    editable={!disabled}
    onBlur={commitText}
    onSubmitEditing={commitText}
    style={{ flex: 1, height: 44 }}
    className="text-center text-foreground font-body"
  />

  <Pressable
    onPress={increment}
    disabled={disabled || value >= max}
    className={`h-11 w-11 items-center justify-center ${disabled || value >= max ? 'opacity-40' : ''}`}
  >
    <Icon as={PlusIcon} size="sm" className="text-foreground" />
  </Pressable>
</Box>
```

- The middle `TextInput` is raw `react-native` `TextInput` (no gluestack `Input`,
  which would add its own border) — the container supplies the border.
- `style={{ flex: 1 }}` per the NativeWind `flex-1` rule; `height: 44` keeps a
  consistent touch height.
- Keep the existing `commitText`/clamp logic and the render-time
  `value !== prevValue` sync (no `useEffect`).

---

## 3. `ProductCard` (`src/components/domain/product-card.tsx`)

### 3.1 Price chip overlay (top-left of image)

Wrap the image/placeholder in a `relative` `Box`; overlay an absolutely
positioned chip:

```tsx
<Box className="relative">
  {imageUrl ? <Image ... /> : <placeholder />}
  <Box className="absolute left-2 top-2 rounded-full bg-card px-2 py-0.5 shadow-sm">
    <Text size="2xs" bold className="text-foreground">
      {formatCurrency(price)}
    </Text>
  </Box>
</Box>
```

- `bg-card` is white (theme `card` = `255 255 255`); `shadow-sm` keeps it
  legible on light images.
- **Remove** the price row that was below the name (no more vertical expansion).

### 3.2 Stepper

- Use the redesigned single-container `QuantityStepper` (fills card width).
- Card layout becomes: image (with chip) → name → stepper / "Ekle" affordance.
- Enable/disable logic unchanged (`quantity === 0` ⇒ `opacity-40`, tap to enable).

---

## 4. Three-phase wizard (`src/screens/staff/StaffHomeScreen.tsx`)

### 4.1 New `ProgressBar` primitive (`src/components/ui/progress-bar.tsx`)

```tsx
type ProgressBarProps = { steps: number; current: number }; // current 0-based

export function ProgressBar({ steps, current }: ProgressBarProps) {
  return (
    <HStack className="w-full gap-1">
      {Array.from({ length: steps }).map((_, i) => (
        <Box
          key={i}
          style={{ flex: 1 }}
          className={`h-1 rounded-full ${i <= current ? 'bg-primary' : 'bg-accent'}`}
        />
      ))}
    </HStack>
  );
}
```

### 4.2 Phase state

Local `useState` in the screen (ephemeral navigation, resets naturally on new
record):

```ts
const [phase, setPhase] = useState<1 | 2 | 3>(1);
```

Reset `setPhase(1)` in the `onSuccess` handlers and the "Yeni Kayıt" button.

### 4.3 Phase titles + validation

```ts
const PHASES = ['Şube Seçimi', 'Ürün Seçimi', 'Gözden Geçirme'] as const;

const canAdvance =
  (phase === 1 && !!draft.branchId) ||
  (phase === 2 && items.length > 0);
```

### 4.4 Screen structure

```tsx
<Box style={{ flex: 1 }} className="p-4">
  <VStack space="sm" style={{ flex: 1 }}>
    <ProgressBar steps={3} current={phase - 1} />
    <Text size="sm" className="text-muted-foreground">{PHASES[phase - 1]}</Text>

    <Box style={{ flex: 1 }}>
      {phase === 1 && <PhaseBranchAndDate />}
      {phase === 2 && <PhaseProducts />}
      {phase === 3 && <PhaseReview />}
    </Box>

    <HStack className="items-center justify-between">
      <Button
        variant="outline"
        disabled={phase === 1}
        onPress={() => setPhase((p) => (p - 1) as 1 | 2 | 3)}
      >
        <ButtonText>Geri</ButtonText>
      </Button>

      {phase < 3 ? (
        <Button disabled={!canAdvance} onPress={() => setPhase((p) => (p + 1) as 1 | 2 | 3)}>
          <ButtonText>İleri</ButtonText>
        </Button>
      ) : (
        <MutationButton size="lg" disabled={!canSubmit || pending} onPress={handleSubmit}>
          <ButtonText>{pending ? 'Kaydediliyor…' : 'Kaydet'}</ButtonText>
        </MutationButton>
      )}
    </HStack>
  </VStack>
</Box>
```

### 4.5 Phase 1 — Şube & Tarih (centered, stacked)

```tsx
<Box style={{ flex: 1 }} className="items-center justify-center">
  <VStack space="lg" style={{ width: 480 }}>
    <BranchSelector value={path} onChange={draft.applyPath} />
    <DateField label="Tarih" value={draft.date} onChange={draft.setDate} />
  </VStack>
</Box>
```

### 4.6 Phase 2 — Ürün Seçimi (grid + price header)

```tsx
<Box style={{ flex: 1 }}>
  <HStack className="mb-3 items-center justify-between">
    <Text size="sm" className="text-muted-foreground">Ürünler</Text>
    <Amount size="md" bold value={preview.requiredAmount} />  {/* price indicator */}
  </HStack>
  <Box style={{ flex: 1 }} onLayout={handleGridLayout}>
    {/* existing grid / loading / error / empty states */}
  </Box>
</Box>
```

### 4.7 Phase 3 — Gözden Geçirme & Onay

Reuse the enhanced `CheckoutSummary` (see §6) as the review body, plus the
`PaymentReceivedInput` above it:

```tsx
<ScrollView>
  <VStack space="lg">
    <CheckoutSummary branchName={...} preview={preview} paymentAmount={draft.paymentAmount} loadingBalance={...} />
    <PaymentReceivedInput value={draft.paymentAmount} onChange={draft.setPaymentAmount} />
    {isEditing && <Button variant="ghost" onPress={cancelEdit}><ButtonText>Düzenlemeyi İptal Et</ButtonText></Button>}
    {createDelivery.isError || updateDelivery.isError ? <Text className="text-destructive">…</Text> : null}
  </VStack>
</ScrollView>
```

The submit button lives in the bottom action bar (phase 3 shows `Kaydet`).

---

## 5. `DateField` → native picker (`src/components/ui/date-field.tsx`)

Rewrite as a pressable field that opens the native Android date dialog.

```tsx
import DateTimePicker from '@expo/ui/community/datetime-picker';
import { parseIsoDate, formatIsoDate, formatDateForDisplay } from '@/utils/dates';

export function DateField({ value, onChange, label, disabled = false }: DateFieldProps) {
  const [open, setOpen] = useState(false);

  return (
    <VStack space="xs">
      {label ? <Text size="xs" bold className="text-muted-foreground">{label}</Text> : null}
      <Pressable
        onPress={() => { if (!disabled) setOpen(true); }}
        className="flex-row items-center gap-2 rounded-lg border border-input bg-background px-3 py-2.5"
      >
        <Icon as={CalendarIcon} size="sm" className="text-muted-foreground" />
        <Text size="sm" className="text-foreground">{formatDateForDisplay(value)}</Text>
      </Pressable>

      {open ? (
        <DateTimePicker
          value={parseIsoDate(value)}
          mode="date"
          presentation="dialog"
          positiveButton={{ label: 'Tamam' }}
          negativeButton={{ label: 'İptal' }}
          onValueChange={(_e, date) => {
            setOpen(false);
            onChange(formatIsoDate(date));
          }}
          onDismiss={() => setOpen(false)}
        />
      ) : null}
    </VStack>
  );
}
```

- Remove the old mask/parse helpers (`formatDigits`, `parseDisplay`) and the
  `Input`/`InputField` imports.
- The `@expo/ui` drop-in is self-contained (wraps its own `Host`); no extra
  provider wiring.
- Dates round-trip at local noon via `parseIsoDate`/`formatIsoDate` to avoid
  UTC day-shift (device is in `Europe/Istanbul`, matching `getIstanbulToday`).

---

## 6. Balance display + review layout (`src/components/domain/checkout-summary.tsx`)

### 6.1 Remove red/blue coloring

Drop `balanceTone` and its `destructive`/`info` mapping. Show the new balance
neutrally with an explicit label:

```tsx
<Row label="Yeni Bakiye">
  <HStack space="sm" className="items-center">
    <Amount size="lg" bold value={preview.resultingBalance} showSign />
    <Text size="xs" className="text-muted-foreground">
      {preview.resultingBalance > 0
        ? 'Borç'
        : preview.resultingBalance < 0
          ? 'Alacak'
          : 'Bakiye'}
    </Text>
  </HStack>
</Row>
```

### 6.2 Nicer item lines (name / adet × birim fiyat / satır toplamı)

```tsx
{preview.lines.map((line) => (
  <VStack key={line.productId} space="xs" className="py-1">
    <HStack className="items-center justify-between">
      <Text size="sm" className="text-foreground">{line.productName}</Text>
      <Amount size="sm" value={line.lineTotal} />
    </HStack>
    <Text size="xs" className="text-muted-foreground">
      {line.deliveredQuantity} adet × {formatCurrency(line.unitPrice)}
    </Text>
  </VStack>
))}
```

The `preview.lines` already carries `unitPrice` and `deliveredQuantity`
(`src/utils/receiptPreview.ts`), so no domain change is required.

---

## Files changed (summary)

**New**
- `docs/phase-5-second-pass-plan.md` (this file)
- `src/components/ui/progress-bar.tsx`
- `src/components/ui/picker/pickerUtils.ts`

**Modified**
- `src/components/ui/picker/index.tsx` — variable width, wrap, font shrink, tap fix
- `src/components/ui/stepper/index.tsx` — single unified container
- `src/components/ui/date-field.tsx` — native date picker
- `src/components/domain/product-card.tsx` — price chip + stepper fit
- `src/components/domain/checkout-summary.tsx` — review layout + neutral balance
- `src/screens/staff/StaffHomeScreen.tsx` — 3-phase wizard
- `src/components/ui/index.ts` — export `ProgressBar`
- `src/utils/dates.ts` — `parseIsoDate` / `formatIsoDate`

**Unchanged domain**
- `src/store/receiptDraft.ts`, services, hooks, types (except as above).

---

## Tests to add

- `tests/utils/pickerUtils.test.ts`
  - `computeSnapOffsets` centers item 0 at `0`, last item at max scroll, and is
    symmetric for equal widths.
  - `pickerFontSize` buckets by length.
  - `snapIndexForOffset` returns nearest index.
- `tests/utils/dates.test.ts` (extend)
  - `parseIsoDate` / `formatIsoDate` round-trip for a few dates, incl. leap day.

---

## Verification

- `npm run lint`, `npm run typecheck`, `npm run test`.
- Tablet landscape smoke test:
  - Wizard: Geri/İleri gating, price indicator updates in Phase 2, review lists
    items/counts/totals.
  - Picker: tap selects-and-centers (no snap-back), scroll-and-release selects
    the centered item, long branch names wrap/shrink and remain distinguishable.
  - Native date dialog opens/closes, returns a valid `YYYY-MM-DD`.
  - Stepper fits card width; price chip overlays the image.
  - Balance shows neutral sign + `Borç`/`Alacak` label.

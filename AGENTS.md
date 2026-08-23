# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Critical: NativeWind v5 layout utilities break on Android

`className="flex-1"` (and possibly other flex utilities) do **not** translate to
React Native styles reliably under NativeWind v5 (`nativewind@5.0.0-preview`,
`react-native-css`). This caused layout containers to collapse to 0 height on
Android — invisible text, and the bottom nav floating to the top.

**Rule:** For critical layout containers (the root/shell layout, content
regions that must fill remaining space), use inline `style={{ flex: 1 }}`
instead of `className="flex-1"`. Cosmetic utilities (colors, spacing, borders,
text) are fine as `className`.

# Custom fonts (Plus Jakarta Sans)

- Fonts are embedded at build time via the `expo-font` config plugin in
  `app.json` (NOT loaded at runtime with `useFonts`). A prebuild is required
  after changing the font list: `npx expo prebuild` then `npx expo run android`.
- On Android, the **font family name is the filename without the extension**,
  e.g. `PlusJakartaSans_400Regular` (from `PlusJakartaSans_400Regular.ttf`).
  Do NOT use a bare family name like `PlusJakartaSans` — it won't resolve.
- The font tokens live in `src/global.css` under `@theme inline` as
  `--font-body`, `--font-medium`, `--font-heading`, `--font-heavy`, and are
  consumed as `font-body` / `font-medium` / `font-heading` / `font-heavy`
  utilities in `src/components/ui/text` and `src/components/ui/heading`.
- Use `font-heavy` (700) for the `bold` variant rather than Tailwind's
  `font-bold`, because `fontWeight` switching to a different embedded file is
  unreliable on Android.

# Styling conventions (gluestack-ui v5)

- Semantic tokens ONLY. Never `typography-*`, `neutral-*`, `gray-*`, numbered
  colors (`red-500`), or inline hex. Use `text-foreground`, `bg-primary`,
  `border-border`, `text-muted-foreground`, `text-destructive`, etc.
- Prefer component props (`size`, `variant`, `space`, `bold`) over `className`.
- Light theme only for now; dark theme is deferred (tokens defined once in
  `src/global.css` `@layer theme :root`).
- New gluestack components are copied into `src/components/ui/<name>/` (not
  installed as deps) and exported from `src/components/ui/index.ts`.

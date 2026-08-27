import { useLocalSearchParams } from 'expo-router';

export type DrilldownLevel = 'cities' | 'districts' | 'branches';

function pickFirst(v: string | string[] | undefined): string | null {
  if (v === undefined) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

// Parses /cities?city=...&district=... query params into a 3-state level +
// selected ids. Expo Router 57 returns params as `string | string[] |
// undefined` — pickFirst normalizes. (Was /branches in PR-6.1; renamed
// when the Şubeler tab took ownership of /branches for the flat analytics
// table.)
export function useGeographyDrilldown() {
  const params = useLocalSearchParams<{
    city?: string | string[];
    district?: string | string[];
  }>();
  const selectedCityId = pickFirst(params.city);
  const selectedDistrictId = pickFirst(params.district);

  const level: DrilldownLevel = !selectedCityId
    ? 'cities'
    : !selectedDistrictId
      ? 'districts'
      : 'branches';

  return { level, selectedCityId, selectedDistrictId };
}
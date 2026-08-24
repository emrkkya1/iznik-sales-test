import { useLocalSearchParams } from 'expo-router';

export type DrilldownLevel = 'cities' | 'districts' | 'branches';

function pickFirst(v: string | string[] | undefined): string | null {
  if (v === undefined) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

// Parses /branches?city=...&district=... query params into a 3-state level +
// selected ids. Expo Router 57 returns params as `string | string[] |
// undefined` — pickFirst normalizes.
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
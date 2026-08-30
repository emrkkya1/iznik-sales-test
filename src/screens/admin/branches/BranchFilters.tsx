import { useMemo } from 'react';

import { DateField } from '@/components/ui/date-field';
import { DayOfWeekPicker } from '@/components/ui/day-of-week-picker';
import { Dropdown, type DropdownOption } from '@/components/ui/dropdown';
import { HStack } from '@/components/ui/hstack';
import { Input, InputField } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useCities, useDistricts } from '@/hooks';
import type { BranchAnalyticsFilters, DayOfWeek } from '@/types';

type BranchFiltersProps = {
  draft: BranchAnalyticsFilters;
  // Functional updater so cascading changes (e.g. city reset triggers
  // district reset) compose cleanly inside the component.
  onDraftChange: (
    updater: (current: BranchAnalyticsFilters) => BranchAnalyticsFilters,
  ) => void;
  // Şube Adı input'u doğrudan header'daki Şube Ara state'ine bağlı;
  // debounce ile query'ye geçer.
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  dateError: string | null;
};

// Şubeler ekranı için filtre formu. FilterSheet'in içine yerleşir; iki
// kolon (sol: tarih + günler, sağ: arama + şehir + ilçe) düzenini
// kurar. Şehir değiştiğinde ilçe otomatik sıfırlanır.
export function BranchFilters({
  draft,
  onDraftChange,
  searchInput,
  onSearchInputChange,
  dateError,
}: BranchFiltersProps) {
  const citiesQuery = useCities();
  const districtsQuery = useDistricts(draft.cityId ?? null);

  const cityOptions: DropdownOption<string>[] = useMemo(
    () =>
      citiesQuery.data?.map((city) => ({
        value: city.id,
        label: city.name,
      })) ?? [],
    [citiesQuery.data],
  );

  const districtOptions: DropdownOption<string>[] = useMemo(
    () =>
      districtsQuery.data?.map((district) => ({
        value: district.id,
        label: district.name,
      })) ?? [],
    [districtsQuery.data],
  );

  const setDaysOfWeek = (next: DayOfWeek[]) =>
    onDraftChange((current) => ({
      ...current,
      daysOfWeek: next.length > 0 ? next : undefined,
    }));

  const setCity = (value: string) =>
    onDraftChange((current) => ({
      ...current,
      cityId: value,
      districtId: undefined,
    }));

  const setDistrict = (value: string) =>
    onDraftChange((current) => ({ ...current, districtId: value }));

  const setDateRange = (from: string | null, to: string | null) =>
    onDraftChange((current) => ({
      ...current,
      dateFrom: from ?? undefined,
      dateTo: to ?? undefined,
    }));

  const handleSearchChange = (value: string) => {
    onSearchInputChange(value);
    onDraftChange((current) => ({ ...current, search: value || undefined }));
  };

  return (
    <HStack space="md" className="items-stretch">
      <VStack space="md" className="flex-1">
        <VStack space="xs">
          <Text size="sm" bold className="text-foreground">
            Başlangıç
          </Text>
          <DateField
            value={draft.dateFrom ?? null}
            onChange={(value) => setDateRange(value, draft.dateTo ?? null)}
            placeholder="Tarih seçin"
          />
        </VStack>
        <VStack space="xs">
          <Text size="sm" bold className="text-foreground">
            Bitiş
          </Text>
          <DateField
            value={draft.dateTo ?? null}
            onChange={(value) => setDateRange(draft.dateFrom ?? null, value)}
            placeholder="Tarih seçin"
          />
        </VStack>
        {dateError ? (
          <Text size="xs" className="text-destructive">
            {dateError}
          </Text>
        ) : null}
        <VStack space="xs">
          <Text size="sm" bold className="text-foreground">
            Haftanın Günleri
          </Text>
          <DayOfWeekPicker
            value={draft.daysOfWeek ?? []}
            onChange={setDaysOfWeek}
          />
        </VStack>
      </VStack>
      <VStack space="md" className="flex-1">
        <VStack space="xs">
          <Text size="sm" bold className="text-foreground">
            Şube Adı
          </Text>
          <Input className="bg-card">
            <InputField
              accessibilityLabel="Şube adı filtresi"
              placeholder="Şube adı…"
              value={searchInput}
              onChangeText={handleSearchChange}
              returnKeyType="search"
            />
          </Input>
        </VStack>
        <VStack space="xs">
          <Text size="sm" bold className="text-foreground">
            Şehir
          </Text>
          <Dropdown
            value={draft.cityId ?? null}
            onChange={setCity}
            options={cityOptions}
            placeholder={citiesQuery.isLoading ? 'Yükleniyor…' : 'Şehir seçin'}
            emptyLabel="Şehir bulunamadı"
            loading={citiesQuery.isLoading}
          />
        </VStack>
        <VStack space="xs">
          <Text size="sm" bold className="text-foreground">
            İlçe
          </Text>
          <Dropdown
            value={draft.districtId ?? null}
            onChange={setDistrict}
            options={districtOptions}
            placeholder={
              !draft.cityId
                ? 'Önce şehir seçin'
                : districtsQuery.isLoading
                  ? 'Yükleniyor…'
                  : 'İlçe seçin'
            }
            emptyLabel="İlçe bulunamadı"
            loading={districtsQuery.isLoading}
            disabled={!draft.cityId}
          />
        </VStack>
      </VStack>
    </HStack>
  );
}

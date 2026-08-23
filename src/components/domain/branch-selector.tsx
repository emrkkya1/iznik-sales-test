import { Picker, type PickerItem } from '@/components/ui/picker';
import { VStack } from '@/components/ui/vstack';
import { useCities, useDistricts, useBranches } from '@/hooks';
import type { BranchPath } from '@/store/receiptDraft';

type BranchSelectorProps = {
  value: BranchPath;
  onChange: (path: BranchPath) => void;
};

export function BranchSelector({ value, onChange }: BranchSelectorProps) {
  const citiesQuery = useCities();
  const districtsQuery = useDistricts(value.cityId);
  const branchesQuery = useBranches(value.districtId);

  const cityItems: PickerItem[] = (citiesQuery.data ?? []).map((c) => ({
    id: c.id,
    label: c.name,
  }));
  const districtItems: PickerItem[] = (districtsQuery.data ?? []).map((d) => ({
    id: d.id,
    label: d.name,
  }));
  const branchItems: PickerItem[] = (branchesQuery.data ?? []).map((b) => ({
    id: b.id,
    label: b.name,
  }));

  return (
    <VStack space="md">
      <Picker
        label="Şehir"
        items={cityItems}
        value={value.cityId}
        onChange={(id) =>
          onChange({ cityId: id, districtId: null, branchId: null })
        }
        loading={citiesQuery.isLoading}
        placeholder="Şehir seçin"
      />
      <Picker
        label="İlçe"
        items={districtItems}
        value={value.districtId}
        onChange={(id) =>
          onChange({ cityId: value.cityId, districtId: id, branchId: null })
        }
        loading={districtsQuery.isLoading}
        disabled={!value.cityId}
        placeholder="Önce şehir seçin"
      />
      <Picker
        label="Şube"
        items={branchItems}
        value={value.branchId}
        onChange={(id) =>
          onChange({
            cityId: value.cityId,
            districtId: value.districtId,
            branchId: id,
          })
        }
        loading={branchesQuery.isLoading}
        disabled={!value.districtId}
        placeholder="Önce ilçe seçin"
      />
    </VStack>
  );
}

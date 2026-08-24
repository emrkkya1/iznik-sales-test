import { useState } from 'react';
import { useRouter } from 'expo-router';

import { Box } from '@/components/ui/box';
import {
  useBranchesWithContext,
  useCitiesWithCounts,
  useCreateBranch,
  useCreateCity,
  useCreateDistrict,
  useDistrictsWithCounts,
  useGeographyDrilldown,
  useOpeningBalancesLocked,
  useSetBranchActive,
  useSetCityActive,
  useSetDistrictActive,
} from '@/hooks';
import type {
  BranchWithContext,
  CityWithCounts,
  DistrictWithCounts,
} from '@/types';
import { getBalanceTone } from '@/utils/formatters';

import { ActionMenu, type ActionMenuItem } from '../../components/admin/ActionMenu';
import { Breadcrumb } from '../../components/admin/Breadcrumb';
import { FloatingCreateButton } from '../../components/admin/FloatingCreateButton';
import { GeographyList } from '../../components/admin/GeographyList';
import {
  GeographyListRow,
  type MenuAnchor,
} from '../../components/admin/GeographyListRow';
import {
  FormSheet,
  type FormField,
} from '../../components/admin/FormSheet';

type ActionTarget =
  | { kind: 'city'; entity: CityWithCounts }
  | { kind: 'district'; entity: DistrictWithCounts }
  | { kind: 'branch'; entity: BranchWithContext };

// DB stores cash in hand directly (cash-flow convention). Positive =
// cash in hand from this branch, negative = cash missing.
function balanceTone(balance: number): 'positive' | 'negative' | 'neutral' {
  if (balance > 0) return 'positive';
  if (balance < 0) return 'negative';
  return 'neutral';
}

function formatBalance(balance: number): string {
  const sign = balance > 0 ? '+' : balance < 0 ? '-' : '';
  const formatted = new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(balance));
  return `${sign}${formatted} ₺`;
}

export function BranchesScreen() {
  const router = useRouter();
  const { level, selectedCityId, selectedDistrictId } = useGeographyDrilldown();

  // Cities are always fetched so the breadcrumb can show city/district names
  // while user is on a deeper level. 5-minute stale time (set in hook) keeps
  // this cheap.
  const citiesQuery = useCitiesWithCounts();
  const cityName = citiesQuery.data?.find((c) => c.id === selectedCityId)?.name;

  const districtsQuery = useDistrictsWithCounts(
    level !== 'cities' ? selectedCityId : null,
  );
  const districtName = districtsQuery.data?.find(
    (d) => d.id === selectedDistrictId,
  )?.name;

  const branchesQuery = useBranchesWithContext(
    level === 'branches' ? selectedDistrictId : null,
  );

  const openingBalancesLocked = useOpeningBalancesLocked();

  const createCity = useCreateCity();
  const createDistrict = useCreateDistrict();
  const createBranch = useCreateBranch();
  const setCityActive = useSetCityActive();
  const setDistrictActive = useSetDistrictActive();
  const setBranchActive = useSetBranchActive();

  const [citySheetOpen, setCitySheetOpen] = useState(false);
  const [districtSheetOpen, setDistrictSheetOpen] = useState(false);
  const [branchSheetOpen, setBranchSheetOpen] = useState(false);
  const [actionTarget, setActionTarget] = useState<ActionTarget | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<MenuAnchor | null>(null);

  const openMenu = (target: ActionTarget, anchor: MenuAnchor) => {
    setActionTarget(target);
    setMenuAnchor(anchor);
  };

  const closeMenu = () => {
    setActionTarget(null);
    setMenuAnchor(null);
  };

  const cityFields: FormField[] = [
    {
      name: 'name',
      label: 'Şehir Adı',
      type: 'text',
      required: true,
      placeholder: 'Örn. Bursa',
    },
  ];

  const districtFields: FormField[] = [
    {
      name: 'name',
      label: 'İlçe Adı',
      type: 'text',
      required: true,
      placeholder: 'Örn. Merkez',
    },
  ];

  const branchFields: FormField[] = [
    {
      name: 'name',
      label: 'Şube Adı',
      type: 'text',
      required: true,
      placeholder: 'Örn. Şube 1',
    },
    ...(!openingBalancesLocked.data
      ? [
          {
            name: 'openingBalance',
            label: 'Açılış Bakiyesi',
            type: 'numeric' as const,
            placeholder: '0,00',
            defaultValue: '0',
          },
        ]
      : []),
    {
      name: 'isActive',
      label: 'Aktif',
      type: 'boolean' as const,
      defaultValue: true,
    },
  ];

  const navigateToBranchHub = (branchId: string) => {
    router.push({ pathname: '/branches/[branchId]', params: { branchId } });
  };

  const openCreateSheet = () => {
    if (level === 'cities') setCitySheetOpen(true);
    else if (level === 'districts') setDistrictSheetOpen(true);
    else setBranchSheetOpen(true);
  };

  const fabLabel =
    level === 'cities'
      ? 'Yeni Şehir'
      : level === 'districts'
        ? 'Yeni İlçe'
        : 'Yeni Şube';

  const buildMenuItems = (target: ActionTarget): ActionMenuItem[] => {
    const isCurrentlyActive =
      target.kind === 'city'
        ? target.entity.isActive
        : target.kind === 'district'
          ? target.entity.isActive
          : target.entity.isActive;
    const toggleLabel = isCurrentlyActive ? 'Pasife Al' : 'Aktifleştir';

    const toggle = () => {
      if (target.kind === 'city') {
        setCityActive.mutate({
          id: target.entity.id,
          isActive: !target.entity.isActive,
        });
      } else if (target.kind === 'district') {
        setDistrictActive.mutate({
          id: target.entity.id,
          isActive: !target.entity.isActive,
        });
      } else {
        setBranchActive.mutate({
          id: target.entity.id,
          isActive: !target.entity.isActive,
        });
      }
    };

    const items: ActionMenuItem[] = [{ label: toggleLabel, onPress: toggle }];

    if (target.kind === 'branch') {
      items.unshift({
        label: 'Şube Ekranı',
        onPress: () => navigateToBranchHub(target.entity.id),
      });
    }

    return items;
  };

  return (
    <Box style={{ flex: 1 }} className="bg-background">
      <Breadcrumb level={level} cityName={cityName} districtName={districtName} />

      <Box style={{ flex: 1 }}>
        {level === 'cities' ? (
          <GeographyList
            isLoading={citiesQuery.isLoading}
            isError={citiesQuery.isError}
            onRetry={() => citiesQuery.refetch()}
            rows={citiesQuery.data ?? []}
            keyExtractor={(c) => c.id}
            renderRow={(city) => (
              <GeographyListRow
                title={city.name}
                subtitle={`${city.districtCount} ilçe • ${city.branchCount} şube`}
                isActive={city.isActive}
                onPress={() =>
                  router.push({
                    pathname: '/branches',
                    params: { city: city.id },
                  })
                }
                onMenu={(anchor) => openMenu({ kind: 'city', entity: city }, anchor)}
              />
            )}
            emptyTitle="Henüz şehir yok"
          />
        ) : null}

        {level === 'districts' && selectedCityId ? (
          <GeographyList
            isLoading={districtsQuery.isLoading}
            isError={districtsQuery.isError}
            onRetry={() => districtsQuery.refetch()}
            rows={districtsQuery.data ?? []}
            keyExtractor={(d) => d.id}
            renderRow={(district) => (
              <GeographyListRow
                title={district.name}
                subtitle={`${district.branchCount} şube • ${district.activeBranchCount} aktif`}
                isActive={district.isActive}
                onPress={() =>
                  router.push({
                    pathname: '/branches',
                    params: { city: selectedCityId, district: district.id },
                  })
                }
                onMenu={(anchor) => openMenu({ kind: 'district', entity: district }, anchor)}
              />
            )}
            emptyTitle={`${cityName ?? 'Bu şehir'} için henüz ilçe yok`}
          />
        ) : null}

        {level === 'branches' && selectedDistrictId ? (
          <GeographyList
            isLoading={branchesQuery.isLoading}
            isError={branchesQuery.isError}
            onRetry={() => branchesQuery.refetch()}
            rows={branchesQuery.data ?? []}
            keyExtractor={(b) => b.id}
            renderRow={(branch) => (
<GeographyListRow
                title={branch.name}
                subtitle={`Bakiye ${formatBalance(branch.currentBalance)}${
                  branch.currentBalance !== 0
                    ? ` · ${getBalanceTone(branch.currentBalance)}`
                    : ''
                }`}
                isActive={branch.isActive}
                balanceTone={balanceTone(branch.currentBalance)}
                onPress={() => navigateToBranchHub(branch.id)}
                onMenu={(anchor) => openMenu({ kind: 'branch', entity: branch }, anchor)}
              />
            )}
            emptyTitle={`${districtName ?? 'Bu ilçe'} için henüz şube yok`}
          />
        ) : null}

        <FloatingCreateButton label={fabLabel} onPress={openCreateSheet} />
      </Box>

      <FormSheet
        open={citySheetOpen}
        title="Yeni Şehir"
        fields={cityFields}
        onSubmit={async (values) => {
          await createCity.mutateAsync({ name: (values.name as string).trim() });
          setCitySheetOpen(false);
        }}
        onCancel={() => setCitySheetOpen(false)}
        isSubmitting={createCity.isPending}
        serverError={createCity.error?.message}
      />

      {selectedCityId ? (
        <FormSheet
          open={districtSheetOpen}
          title="Yeni İlçe"
          fields={districtFields}
          onSubmit={async (values) => {
            await createDistrict.mutateAsync({
              cityId: selectedCityId,
              name: (values.name as string).trim(),
            });
            setDistrictSheetOpen(false);
          }}
          onCancel={() => setDistrictSheetOpen(false)}
          isSubmitting={createDistrict.isPending}
          serverError={createDistrict.error?.message}
        />
      ) : null}

      {selectedDistrictId ? (
        <FormSheet
          open={branchSheetOpen}
          title="Yeni Şube"
          fields={branchFields}
          onSubmit={async (values) => {
            const balanceStr = values.openingBalance as string | undefined;
            const balance = balanceStr
              ? Number(balanceStr.replace(',', '.'))
              : 0;
            await createBranch.mutateAsync({
              districtId: selectedDistrictId,
              name: (values.name as string).trim(),
              openingBalance: Number.isFinite(balance) ? balance : 0,
              isActive: Boolean(values.isActive),
            });
            setBranchSheetOpen(false);
          }}
          onCancel={() => setBranchSheetOpen(false)}
          isSubmitting={createBranch.isPending}
          serverError={createBranch.error?.message}
        />
      ) : null}

      <ActionMenu
        open={!!actionTarget}
        onClose={closeMenu}
        items={actionTarget ? buildMenuItems(actionTarget) : []}
        anchor={menuAnchor}
      />
    </Box>
  );
}
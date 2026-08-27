import { useRouter } from 'expo-router';

import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';

export type DrilldownLevel = 'cities' | 'districts' | 'branches';

type BreadcrumbProps = {
  level: DrilldownLevel;
  cityName?: string;
  districtName?: string;
};

// Single rendered "crumb" — non-interactive terminal segment.
function CurrentCrumb({ label }: { label: string }) {
  return (
    <Text size="md" bold className="text-foreground">
      {label}
    </Text>
  );
}

// Clickable leading segment. tapUp = clear all params below this level.
function LinkCrumb({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="link">
      <Text size="md" className="text-primary">
        {label}
      </Text>
    </Pressable>
  );
}

function Separator() {
  return (
    <Text size="md" className="text-muted-foreground">
      ›
    </Text>
  );
}

// Breadcrumb across cities → districts → branches drill-down.
// Tap on a non-terminal segment jumps up one level. setParams({x: undefined})
// REMOVES a query param in Expo Router 57 — null is silently ignored.
export function Breadcrumb({ level, cityName, districtName }: BreadcrumbProps) {
  const router = useRouter();

  if (level === 'cities') {
    return (
      <Box className="border-b border-border bg-card px-6 py-3">
        <Text size="md" bold className="text-foreground">
          Şehirler
        </Text>
      </Box>
    );
  }

  if (level === 'districts') {
    return (
      <Box className="border-b border-border bg-card px-6 py-3">
        <HStack space="sm" className="items-center">
          <LinkCrumb
            label="Şehirler"
            onPress={() => router.push('/cities')}
          />
          <Separator />
          <CurrentCrumb label={cityName ?? '…'} />
          <Separator />
          <CurrentCrumb label="İlçeler" />
        </HStack>
      </Box>
    );
  }

  return (
    <Box className="border-b border-border bg-card px-6 py-3">
      <HStack space="sm" className="items-center">
        <LinkCrumb
          label="Şehirler"
          onPress={() => router.push('/cities')}
        />
        <Separator />
        <LinkCrumb
          label={cityName ?? '…'}
          onPress={() => router.setParams({ district: undefined })}
        />
        <Separator />
        <CurrentCrumb label={districtName ?? '…'} />
        <Separator />
        <CurrentCrumb label="Şubeler" />
      </HStack>
    </Box>
  );
}
import { useRef } from 'react';
import { View } from 'react-native';

import { HStack } from '@/components/ui/hstack';
import { Icon, ChevronRightIcon, MoreVerticalIcon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

import { ActiveBadge } from './ActiveBadge';

export type MenuAnchor = { top: number; height: number };

type GeographyListRowProps = {
  title: string;
  subtitle?: string;
  isActive: boolean;
  balanceTone?: 'positive' | 'negative' | 'neutral';
  onPress?: () => void;
  // Receives the trigger's measured position (absolute screen px) so the
  // ActionMenu can anchor itself near the 3-dots button.
  onMenu?: (anchor: MenuAnchor) => void;
  className?: string;
};

// Positive = "Alacak" (the branch owes us) → info/blue.
// Negative = "Borç" (we owe the branch) → destructive/red.
const BALANCE_TONE_CLASS: Record<NonNullable<GeographyListRowProps['balanceTone']>, string> = {
  positive: 'text-info',
  negative: 'text-destructive',
  neutral: 'text-muted-foreground',
};

// Row used by GeographyList for cities / districts / branches. Body is a
// Pressable; the ⋮ button is nested and uses measureInWindow + stopPropagation
// so tapping the menu doesn't fire onPress (which navigates on branch rows).
export function GeographyListRow({
  title,
  subtitle,
  isActive,
  balanceTone,
  onPress,
  onMenu,
  className,
}: GeographyListRowProps) {
  const menuRef = useRef<View>(null);
  const subtitleClass = balanceTone
    ? BALANCE_TONE_CLASS[balanceTone]
    : 'text-muted-foreground';

  const handleMenuPress = () => {
    menuRef.current?.measureInWindow((x, y, width, height) => {
      onMenu?.({ top: y, height });
    });
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      className={`flex-row items-center justify-between border-b border-border py-4 ${
        className ?? ''
      }`}
    >
      <VStack space="xs" className="flex-1 pr-3">
        <HStack space="sm" className="items-center">
          <Text size="md" bold numberOfLines={1} className="text-foreground">
            {title}
          </Text>
          <ActiveBadge isActive={isActive} />
        </HStack>
        {subtitle ? (
          <Text size="xs" className={subtitleClass}>
            {subtitle}
          </Text>
        ) : null}
      </VStack>

      <HStack space="xs" className="items-center">
        {onPress ? (
          <Icon as={ChevronRightIcon} size="md" className="text-muted-foreground" />
        ) : null}
        {onMenu ? (
          <Pressable
            ref={menuRef}
            onPress={(e) => {
              e.stopPropagation();
              handleMenuPress();
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="İşlem menüsü"
            className="items-center justify-center rounded-md p-1"
          >
            <Icon as={MoreVerticalIcon} size="md" className="text-muted-foreground" />
          </Pressable>
        ) : null}
      </HStack>
    </Pressable>
  );
}
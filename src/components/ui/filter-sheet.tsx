import type { ReactNode } from 'react';
import { type DimensionValue, useWindowDimensions } from 'react-native';

import { Box } from '@/components/ui/box';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';

type FilterSheetProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  /**
   * Filtre formunun içeriği. BottomSheet primitive'i
   * `scrollable=false` modunda çalışır; bu nedenle içeride ScrollView
   * istiyorsanız onu kendiniz yönetin.
   */
  children?: ReactNode;
  /**
   * Uygula/Temizle aksiyonları için alt kısım. Verilirse sticky footer
   * olarak gösterilir.
   */
  footer?: ReactNode;
  /**
   * BottomSheet'i viewport'un alt kenarından yukarı kaydırır; dropdown
   * popover'ları için görünür alan bırakır.
   */
  topOffset?: DimensionValue;
};

// Yeniden kullanılabilir filtre sheet'i. BottomSheet primitive'inin
// `scrollable=false` modunu kullanarak gövde ve footer'ı ayrı ayrı
// render eder; içeride kendi ScrollView'inizi yönetirsiniz.
//
// Visual contract:
//   - BottomSheet ile aynı scrim/header davranışı
//   - Gövde sheet içinde kalan tüm yüksekliği kaplar (flex: 1)
//   - Footer verildiğinde border-t ile ayrılır
//   - topOffset ile sheet yukarı kaydırılabilir (dropdown'lar için)
export function FilterSheet({
  open,
  onClose,
  title = 'Filtrele',
  children,
  footer,
  topOffset,
}: FilterSheetProps) {
  const { height: viewportHeight } = useWindowDimensions();

  return (
    <BottomSheet
      open={open}
      title={title}
      onClose={onClose}
      scrollable={false}
      maxHeight={viewportHeight}
      contentPadding={0}
      topOffset={topOffset}
    >
      <Box className="px-4 py-3" style={{ flexShrink: 1 }}>
        {children}
      </Box>
      {footer ? (
        <Box className="border-t border-border bg-card px-4 py-3">
          <HStack space="sm">{footer}</HStack>
        </Box>
      ) : null}
    </BottomSheet>
  );
}

export function FilterSheetApplyButton({
  onPress,
  label = 'Uygula',
  disabled = false,
}: {
  onPress: () => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <Button
      variant="default"
      size="default"
      onPress={onPress}
      disabled={disabled}
      className="flex-1"
    >
      <ButtonText>{label}</ButtonText>
    </Button>
  );
}

export function FilterSheetResetButton({
  onPress,
  label = 'Temizle',
  disabled = false,
}: {
  onPress: () => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <Button
      variant="outline"
      size="default"
      onPress={onPress}
      disabled={disabled}
    >
      <ButtonText>{label}</ButtonText>
    </Button>
  );
}

import { useState } from 'react';
import { Modal, Pressable, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';

export type ActionMenuItem = {
  label: string;
  onPress: () => void;
  destructive?: boolean;
};

type ActionMenuProps = {
  open: boolean;
  onClose: () => void;
  items: ActionMenuItem[];
  // Y coord (absolute screen px) of the trigger's top edge + height of the
  // trigger, used to anchor the popover near the 3-dots button.
  anchor: { top: number; height: number } | null;
};

// Standard 3-dots popover. Anchored to the trigger with smart-flip:
//   - preferred: above the trigger (8px gap) when there's room
//   - fallback: below the trigger when above would clip into the status bar
// Tap-outside (light scrim) dismisses; tapping an item runs its onPress
// then closes. Built on RN's Modal with absolute positioning.
export function ActionMenu({ open, onClose, items, anchor }: ActionMenuProps) {
  const insets = useSafeAreaInsets();
  const [measuredHeight, setMeasuredHeight] = useState<number | null>(null);

  const handleMenuLayout = (e: LayoutChangeEvent) => {
    setMeasuredHeight(e.nativeEvent.layout.height);
  };

  // Decide flip: try above first, fall back to below.
  const placement = (() => {
    if (!anchor) return null;
    const menuHeight = measuredHeight ?? 0;
    const aboveY = anchor.top - menuHeight - 8;
    const minY = insets.top + 8;
    if (aboveY >= minY) {
      return { top: aboveY, anchor: 'above' as const };
    }
    return { top: anchor.top + anchor.height + 8, anchor: 'below' as const };
  })();

  return (
    <Modal
      transparent
      visible={open}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 bg-black/20"
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Menüyü kapat"
      >
        {anchor && placement ? (
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: placement.top,
              right: Math.max(insets.right, 16),
              minWidth: 200,
            }}
            onLayout={handleMenuLayout}
          >
            <Box className="rounded-xl border border-border bg-card shadow-lg">
              {items.map((item, idx) => (
                <Pressable
                  key={`${item.label}-${idx}`}
                  onPress={() => {
                    item.onPress();
                    onClose();
                  }}
                  accessibilityRole="button"
                  className={`px-4 py-3 ${
                    idx < items.length - 1 ? 'border-b border-border' : ''
                  }`}
                >
                  <Text
                    size="md"
                    bold
                    className={
                      item.destructive
                        ? 'text-destructive'
                        : 'text-foreground'
                    }
                  >
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </Box>
          </Pressable>
        ) : null}
      </Pressable>
    </Modal>
  );
}
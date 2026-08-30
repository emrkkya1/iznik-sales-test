import type { ReactNode } from 'react';
import {
  type DimensionValue,
  Modal,
  Pressable,
  ScrollView,
  useWindowDimensions,
} from 'react-native';

import { Box } from './box';
import { Button, ButtonText } from './button';
import { HStack } from './hstack';
import { Text } from './text';

type BottomSheetProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  // Caps the sheet height. Defaults to viewport height so the sheet
  // fills the available space when `topOffset` is set.
  maxHeight?: number;
  // When true, wraps children in a ScrollView so content scrolls inside the
  // sheet when it overflows. Set false when the consumer needs its own
  // KeyboardAvoidingView / ScrollView (e.g. the form sheet).
  scrollable?: boolean;
  // Optional padding for the content container. Defaults to 24px all sides.
  contentPadding?: number;
  // Pushes the sheet up from the bottom so dropdown popovers anchored
  // below their triggers have more visible space. Accepts any RN
  // DimensionValue ('12%', 80, etc.).
  topOffset?: DimensionValue;
};

// Shared bottom-sheet primitive.
//
// Visual contract:
//   - Slides up from below (animationType="slide")
//   - Title on the left, "Kapat" button on the right
//   - No dividers between header and body, or between body and footer
//   - Tap on the scrim (outside the sheet) closes
//   - The sheet body grows to fill the available space when topOffset
//     is provided, so footer buttons always sit at the bottom of the
//     sheet, not floating mid-screen.
export function BottomSheet({
  open,
  title,
  onClose,
  children,
  maxHeight,
  scrollable = true,
  contentPadding = 24,
  topOffset,
}: BottomSheetProps) {
  const { height: viewportHeight } = useWindowDimensions();

  // Resolve topOffset (DimensionValue) into a numeric bottom margin so
  // the sheet slides up from the viewport's bottom edge by that amount.
  function resolveTopOffset(): number {
    if (topOffset === undefined) return 0;
    if (typeof topOffset === 'number') return topOffset;
    if (typeof topOffset === 'string' && topOffset.endsWith('%')) {
      const pct = Number(topOffset.slice(0, -1));
      if (!Number.isNaN(pct)) {
        return Math.round((viewportHeight * pct) / 100);
      }
    }
    return 0;
  }

  const sheetMaxHeight =
    maxHeight ??
    // topOffset varsa sheet viewport'un altına yapışık kalır ve
    // yüksekliği viewport - topOffset olur; böylece içerik az olsa
    // bile footer ekranın altına yakın durur, altta boşluk olmaz.
    // Modal transparent modda ve expo-navigation-bar hidden ile
    // insets.bottom zaten 0; ek pay bırakmıyoruz.
    (topOffset !== undefined
      ? viewportHeight - resolveTopOffset()
      : viewportHeight);

  return (
    <Modal
      transparent
      visible={open}
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'flex-end',
        }}
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            maxHeight: sheetMaxHeight,
          }}
        >
          <Box
            className="w-full rounded-t-2xl border-t border-border bg-card"
            style={{ flexShrink: 1 }}
          >
            <HStack className="items-center justify-between px-4 py-3">
              <Text size="lg" bold className="text-foreground">
                {title}
              </Text>
              <Button variant="ghost" size="sm" onPress={onClose}>
                <ButtonText>Kapat</ButtonText>
              </Button>
            </HStack>

            {scrollable ? (
              <ScrollView
                style={{ flexGrow: 0, flexShrink: 1 }}
                contentContainerStyle={{
                  padding: contentPadding,
                  gap: 12,
                }}
                keyboardShouldPersistTaps="handled"
              >
                {children}
              </ScrollView>
            ) : (
              <Box
                style={{
                  padding: contentPadding,
                }}
              >
                {children}
              </Box>
            )}
          </Box>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

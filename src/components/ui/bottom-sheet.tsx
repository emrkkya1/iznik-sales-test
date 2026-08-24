import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Box } from './box';
import { Button, ButtonText } from './button';
import { HStack } from './hstack';
import { Text } from './text';

type BottomSheetProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  // Caps the sheet height so it never grows past this. Defaults to a generous
  // value that fits the tablet landscape with header + body + footer.
  maxHeight?: number;
  // When true, wraps children in a ScrollView so content scrolls inside the
  // sheet when it overflows. Set false when the consumer needs its own
  // KeyboardAvoidingView / ScrollView (e.g. the form sheet).
  scrollable?: boolean;
  // Optional padding for the content container. Defaults to 24px all sides.
  contentPadding?: number;
};

// Shared bottom-sheet primitive.
//
// Visual contract:
//   - Slides up from below (animationType="slide")
//   - Title on the left, "Kapat" button on the right
//   - No dividers between header and body, or between body and footer
//   - Tap on the scrim (outside the sheet) closes
//   - Inline styles for the root (Modal's native window doesn't reliably
//     apply NativeWind flex-1 polyfills; inline is guaranteed).
export function BottomSheet({
  open,
  title,
  onClose,
  children,
  maxHeight = 480,
  scrollable = true,
  contentPadding = 24,
}: BottomSheetProps) {
  const insets = useSafeAreaInsets();

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
        <Pressable onPress={(e) => e.stopPropagation()}>
          <Box
            className="w-full rounded-t-2xl border-t border-border bg-card"
            style={{
              paddingBottom: Math.max(insets.bottom, 12),
              maxHeight,
              flexShrink: 1,
            }}
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
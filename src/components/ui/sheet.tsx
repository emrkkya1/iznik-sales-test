import type { ReactNode } from 'react';
import { Modal, Pressable } from 'react-native';

import { Box } from './box';
import { Button, ButtonIcon } from './button';
import { HStack } from './hstack';
import { CloseIcon } from './icon';import { Text } from './text';

type SheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

export function Sheet({ open, onClose, title, children }: SheetProps) {
  return (
    <Modal
      transparent
      visible={open}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Box style={{ flex: 1, flexDirection: 'row' }} className="bg-black/50">
        <Pressable style={{ flex: 1 }} onPress={onClose} />

        <Box
          style={{ width: 384, maxWidth: '85%' }}
          className="border-r border-border bg-background"
        >
          <HStack className="items-center justify-between border-b border-border px-4 py-3">
            <Text size="lg" bold className="text-foreground">
              {title}
            </Text>
            <Button variant="ghost" size="icon" onPress={onClose}>
              <ButtonIcon as={CloseIcon} />
            </Button>
          </HStack>

          <Box style={{ flex: 1 }}>{children}</Box>
        </Box>
      </Box>
    </Modal>
  );
}

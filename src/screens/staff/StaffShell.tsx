import type { ReactNode } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { useSignOut } from '@/hooks/useSignOut';
import { useAuthStore } from '@/store';

type StaffShellProps = {
  children: ReactNode;
};

export function StaffShell({ children }: StaffShellProps) {
  const user = useAuthStore((s) => s.user);
  const signOut = useSignOut();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Box className="flex-1">
        <HStack className="items-center justify-between border-b border-border px-6 py-4">
          <Text size="lg" bold className="text-foreground">
            Tarihi İznik Fırını
          </Text>
          <HStack space="md" className="items-center">
            <Text size="sm" className="text-muted-foreground">
              {user?.fullName ?? ''}
            </Text>
            <Button variant="outline" size="sm" onPress={() => signOut.mutate()}>
              <ButtonText>Çıkış</ButtonText>
            </Button>
          </HStack>
        </HStack>

        <Box className="flex-1">{children}</Box>
      </Box>
    </SafeAreaView>
  );
}

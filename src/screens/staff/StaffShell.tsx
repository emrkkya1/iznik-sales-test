import type { ReactNode } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, usePathname } from 'expo-router';
import type { Href } from 'expo-router';

import { Box } from '@/components/ui/box';
import { Button, ButtonText, ButtonIcon } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { Icon, ClockIcon, HomeIcon, LogOutIcon } from '@/components/ui/icon';
import { useSignOut } from '@/hooks/useSignOut';
import { useAuthStore } from '@/store';

const NAV_ITEMS: { href: Href; label: string; icon: React.ElementType }[] = [
  { href: '/home', label: 'Ana Sayfa', icon: HomeIcon },
  { href: '/history', label: 'Geçmiş', icon: ClockIcon },
];

type StaffShellProps = {
  children: ReactNode;
};

export function StaffShell({ children }: StaffShellProps) {
  const user = useAuthStore((s) => s.user);
  const signOut = useSignOut();
  const pathname = usePathname();

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-background">
      <Box style={{ flex: 1 }} className="flex-col">
        <HStack className="items-center justify-between border-b border-border px-6 py-4">
          <HStack space="md" className="items-center">
            <Box className="h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <Text size="sm" bold className="text-primary-foreground">
                İF
              </Text>
            </Box>
            <VStack space="xs">
              <Text size="lg" bold className="text-foreground">
                Tarihi İznik Fırını
              </Text>
              <Text size="xs" className="text-muted-foreground">
                Teslimat Girişi
              </Text>
            </VStack>
          </HStack>

          <HStack space="md" className="items-center">
            <Text size="sm" className="text-muted-foreground">
              {user?.fullName ?? ''}
            </Text>
            <Button variant="outline" size="sm" onPress={() => signOut.mutate()}>
              <ButtonIcon as={LogOutIcon} />
              <ButtonText>Çıkış</ButtonText>
            </Button>
          </HStack>
        </HStack>

        <Box style={{ flex: 1 }}>{children}</Box>

        <HStack className="border-t border-border bg-card px-2 py-1 flex-shrink-0">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link key={item.label} href={item.href} asChild>
                <Pressable className="flex-1 items-center justify-center gap-0.5 rounded-xl px-2 py-1">
                  <Box
                    className={`items-center justify-center rounded-xl px-2.5 py-0.5 ${
                      active ? 'bg-primary' : 'bg-transparent'
                    }`}
                  >
                    <Icon
                      as={item.icon}
                      size="lg"
                      className={active ? 'text-primary-foreground' : 'text-muted-foreground'}
                    />
                  </Box>
                  <Text
                    size="xs"
                    bold={active}
                    className={active ? 'text-primary' : 'text-muted-foreground'}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              </Link>
            );
          })}
        </HStack>
      </Box>
    </SafeAreaView>
  );
}

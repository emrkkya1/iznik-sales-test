import type { ReactNode } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, usePathname } from 'expo-router';

import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useSignOut } from '@/hooks/useSignOut';
import { useAuthStore } from '@/store';

const NAV_ITEMS: { href: string; label: string }[] = [
  { href: '/summary', label: 'Özet' },
  { href: '/branches', label: 'Şubeler' },
  { href: '/products', label: 'Ürünler' },
  { href: '/payments', label: 'Tahsilatlar' },
  { href: '/records', label: 'Kayıtlar' },
  { href: '/users', label: 'Kullanıcılar' },
  { href: '/settings', label: 'Ayarlar' },
];

type AdminShellProps = {
  children: ReactNode;
};

export function AdminShell({ children }: AdminShellProps) {
  const user = useAuthStore((s) => s.user);
  const signOut = useSignOut();
  const pathname = usePathname();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Box className="flex-1">
        <HStack className="items-center justify-between border-b border-border px-6 py-4">
          <Text size="lg" bold className="text-foreground">
            Yönetim Paneli
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

        <Box className="flex-1 flex-row">
          <VStack className="w-56 border-r border-border p-3" space="sm">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link key={item.href} href={item.href} asChild>
                  <Button
                    variant={active ? 'default' : 'ghost'}
                    className="justify-start"
                  >
                    <ButtonText>{item.label}</ButtonText>
                  </Button>
                </Link>
              );
            })}
          </VStack>

          <Box className="flex-1">{children}</Box>
        </Box>
      </Box>
    </SafeAreaView>
  );
}

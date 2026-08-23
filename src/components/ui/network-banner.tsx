import { HStack } from './hstack';
import { Icon, WifiOffIcon } from './icon';
import { Text } from './text';
import { useConnectivityStore } from '@/store/connectivity';

export function NetworkBanner() {
  const isOnline = useConnectivityStore((s) => s.isOnline);

  if (isOnline) return null;

  return (
    <HStack className="items-center justify-center gap-2 bg-destructive px-4 py-2">
      <Icon as={WifiOffIcon} size="sm" className="text-destructive-foreground" />
      <Text size="sm" className="text-destructive-foreground">
        Bağlantı yok. Kayıt için internet gerekli.
      </Text>
    </HStack>
  );
}

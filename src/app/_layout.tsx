import { useState } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';
import { NavigationBar } from 'expo-navigation-bar';

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Box } from '@/components/ui/box';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { validateEnv } from '@/config/env';
import { queryClient } from '@/hooks/queryClient';
import { useAuthBootstrap } from '@/hooks/useAuthBootstrap';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useAuthStore } from '@/store';
import '@/global.css';

function AppContent() {
  const [configError] = useState<string | null>(() => {
    try {
      validateEnv();
      return null;
    } catch (error) {
      return error instanceof Error
        ? error.message
        : 'Yapılandırma hatası oluştu.';
    }
  });

  const { isRestoring } = useAuthBootstrap();
  const session = useAuthStore((s) => s.session);
  const user = useAuthStore((s) => s.user);

  useOnlineStatus();

  if (configError) {
    return (
      <Box className="flex-1 items-center justify-center bg-background p-6">
        <VStack space="md" className="items-center">
          <Text size="xl" bold className="text-center text-destructive">
            Yapılandırma Hatası
          </Text>
          <Text size="sm" className="text-center text-muted-foreground">
            {configError}
          </Text>
        </VStack>
      </Box>
    );
  }

  if (isRestoring) {
    return (
      <Box className="flex-1 items-center justify-center bg-background">
        <Spinner label="Yükleniyor..." />
      </Box>
    );
  }

  const role = user?.role;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={session !== null && role === 'staff'}>
        <Stack.Screen name="(staff)" />
      </Stack.Protected>
      <Stack.Protected guard={session !== null && role === 'admin'}>
        <Stack.Screen name="(admin)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <>
      <NavigationBar hidden />
      {/* GestureHandlerRootView is a third-party wrapper. Inline
          backgroundColor mirrors the --background token (255 255 255)
          in src/global.css as a defensive measure; the rest of the app
          uses `bg-background`. */}
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <QueryClientProvider client={queryClient}>
          <GluestackUIProvider mode="system">
            <ErrorBoundary>
              <AppContent />
            </ErrorBoundary>
          </GluestackUIProvider>
        </QueryClientProvider>
      </GestureHandlerRootView>
    </>
  );
}

import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Spinner } from '@/components/ui/spinner';
import { validateEnv } from '@/config/env';
import { queryClient } from '@/hooks/queryClient';
import { useAuthBootstrap } from '@/hooks/useAuthBootstrap';
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

  if (configError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Yapılandırma Hatası</Text>
        <Text style={styles.errorMessage}>{configError}</Text>
      </View>
    );
  }

  if (isRestoring) {
    return (
      <View style={styles.loadingContainer}>
        <Spinner label="Yükleniyor..." />
      </View>
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <GluestackUIProvider mode="system">
          <ErrorBoundary>
            <AppContent />
          </ErrorBoundary>
        </GluestackUIProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#dc2626',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
  },
});

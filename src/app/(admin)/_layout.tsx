import { Stack } from 'expo-router';

import { AdminShell } from '@/screens/admin';

export default function AdminLayout() {
  return (
    <AdminShell>
      <Stack screenOptions={{ headerShown: false }} />
    </AdminShell>
  );
}

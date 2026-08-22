import { Stack } from 'expo-router';

import { StaffShell } from '@/screens/staff';

export default function StaffLayout() {
  return (
    <StaffShell>
      <Stack screenOptions={{ headerShown: false }} />
    </StaffShell>
  );
}

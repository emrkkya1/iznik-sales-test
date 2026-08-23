import { Redirect } from 'expo-router';

import { useAuthStore } from '@/store';

export default function Index() {
  const session = useAuthStore((s) => s.session);
  const user = useAuthStore((s) => s.user);

  if (!session || !user) {
    return <Redirect href="/sign-in" />;
  }

  if (user.role === 'admin') {
    return <Redirect href="/summary" />;
  }

  return <Redirect href="/home" />;
}

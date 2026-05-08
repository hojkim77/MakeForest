'use client';

import { useSession } from 'next-auth/react';
import { useForceLogoutStream } from '@/hooks/useForceLogoutStream';

export function SessionGuard() {
  const { data: session } = useSession();
  useForceLogoutStream(session?.user?.id ?? null, session?.user?.loginToken ?? null);
  return null;
}

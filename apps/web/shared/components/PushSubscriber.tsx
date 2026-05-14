'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { usePushNotification } from '@/shared/hooks/usePushNotification';

export function PushSubscriber() {
  const { status, data: session } = useSession();
  const { subscribe } = usePushNotification();

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.id) return;
    subscribe().catch(() => {});
  }, [status]);

  return null;
}

'use client';

import { useEffect } from 'react';
import { signOut } from 'next-auth/react';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:4000';

export function useForceLogoutStream(userId: string | null) {
  useEffect(() => {
    if (!userId) return;

    let es: EventSource;
    let retryDelay = 1000;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let destroyed = false;

    const connect = () => {
      es = new EventSource(`${SERVER_URL}/sse/user?userId=${encodeURIComponent(userId)}`);

      es.addEventListener('force_logout', () => {
        es.close();
        void signOut({ redirect: true, callbackUrl: '/login' });
      });

      es.onerror = () => {
        es.close();
        if (destroyed) return;
        retryTimer = setTimeout(() => {
          retryDelay = Math.min(retryDelay * 2, 30_000);
          connect();
        }, retryDelay);
      };

      es.addEventListener('open', () => { retryDelay = 1000; });
    };

    connect();

    return () => {
      destroyed = true;
      if (retryTimer) clearTimeout(retryTimer);
      es?.close();
    };
  }, [userId]);
}

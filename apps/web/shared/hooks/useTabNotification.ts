'use client';

import { useEffect } from 'react';
import { setUnreadCount, clearTabNotification } from '@/shared/lib/tabNotification';

export function useTabNotification(unreadCount: number): void {
  useEffect(() => {
    setUnreadCount(unreadCount);
  }, [unreadCount]);

  useEffect(() => {
    return () => {
      clearTabNotification();
    };
  }, []);
}

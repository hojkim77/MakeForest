'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Icon } from '../Icon';
import { PokeDropdown } from './PokeDropdown';
import { usePokeInboxQuery } from '@/shared/hooks/queries/usePokeInboxQuery';
import { usePokeReadMutation } from '@/shared/hooks/mutations/usePokeReadMutation';
import { useTabNotification } from '@/shared/hooks/useTabNotification';

export function NotificationBell() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data } = usePokeInboxQuery(userId);
  const readMutation = usePokeReadMutation(userId);

  const unreadCount = data?.unreadCount ?? 0;
  useTabNotification(unreadCount);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!userId) return null;

  function handleBellClick() {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen && unreadCount > 0) {
      readMutation.mutate();
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={handleBellClick}
        className="p-xs text-on-surface-variant hover:bg-surface-container-high transition-none relative"
        aria-label="알림"
      >
        <Icon name="notifications" filled={unreadCount > 0} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-error" />
        )}
      </button>
      {open && data && <PokeDropdown data={data} />}
    </div>
  );
}

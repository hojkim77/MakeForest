'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Icon } from '@/shared/components/ui/Icon';
import { Divider } from '@/shared/components/ui/Divider';
import { useFriendsListQuery } from '@/shared/hooks/queries/useFriendsQuery';
import { usePointsQuery } from '@/shared/hooks/queries/usePointsQuery';
import { FriendsAccordion } from './FriendsAccordion';
import { AddFriendsView } from './AddFriendsView';

type WidgetView = 'list' | 'add';

export function FriendsWidget() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<WidgetView>('list');

  const { data: friendsData } = useFriendsListQuery(userId);
  const { data: pointsData } = usePointsQuery(userId);

  if (!userId) return null;

  const points = pointsData?.balance ?? 0;

  return (
    <div className="fixed bottom-16 right-4 z-50 w-64 bg-surface border-2 border-outline shadow-island">
      {/* Header */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-surface-container-high transition-none"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <Icon name="group" size={18} className="text-primary" />
          <span className="font-mono text-label text-on-surface">
            친구 {friendsData ? `(${friendsData.friends.length})` : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-primary">{points}pt</span>
          <Icon
            name={isOpen ? 'expand_more' : 'expand_less'}
            size={18}
            className="text-on-surface-variant"
          />
        </div>
      </button>

      {/* Body */}
      {isOpen && (
        <div>
          <Divider />
          {/* Sub-nav */}
          <div className="flex border-b border-outline-variant">
            <button
              onClick={() => setView('list')}
              className={[
                'flex-1 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-none',
                view === 'list'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-on-surface-variant hover:bg-surface-container-high',
              ].join(' ')}
            >
              목록
            </button>
            <button
              onClick={() => setView('add')}
              className={[
                'flex-1 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-none',
                view === 'add'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-on-surface-variant hover:bg-surface-container-high',
              ].join(' ')}
            >
              친구 추가
            </button>
          </div>

          {view === 'list' && friendsData ? (
            <FriendsAccordion
              data={friendsData}
              userId={userId}
              myPoints={points}
              onAddFriends={() => setView('add')}
            />
          ) : view === 'list' && !friendsData ? (
            <div className="px-3 py-4 text-center">
              <Icon name="progress_activity" size={20} className="text-on-surface-variant animate-spin" />
            </div>
          ) : null}

          {view === 'add' && <AddFriendsView userId={userId} />}
        </div>
      )}
    </div>
  );
}

'use client';

import type { FriendListItemType } from '@makeforest/types';
import { Icon } from '@/shared/components/ui/Icon';
import { PokeButton } from './PokeButton';

const STATUS_LABEL: Record<FriendListItemType['status'], { label: string; color: string }> = {
  RUNNING: { label: 'RUNNING', color: 'text-green-500' },
  IDLE: { label: 'IDLE', color: 'text-yellow-500' },
  OFFLINE: { label: 'OFFLINE', color: 'text-on-surface-variant' },
};

interface FriendCardProps {
  friend: FriendListItemType;
  myUserId: string;
  myPoints: number;
  onDelete: (userId: string) => void;
}

export function FriendCard({ friend, myUserId, myPoints, onDelete }: FriendCardProps) {
  const isPending = friend.friendStatus === 'PENDING_OUTGOING';
  const statusInfo = STATUS_LABEL[friend.status];

  return (
    <div className={`flex items-center justify-between px-3 py-2 border-b border-outline-variant last:border-0${isPending ? ' opacity-50' : ''}`}>
      <div className="flex flex-col min-w-0 flex-1">
        <span className="font-mono text-label text-on-surface truncate">{friend.nickname}</span>
        <div className="flex items-center gap-2 mt-0.5">
          {friend.dongName && (
            <span className="font-sans text-[11px] text-on-surface-variant flex items-center gap-0.5">
              <Icon name="location_on" size={12} />
              {friend.dongName}
            </span>
          )}
          {isPending ? (
            <span className="font-sans text-sm text-on-surface-variant">대기중</span>
          ) : (
            <span className={`font-mono text-[10px] ${statusInfo.color}`}>{statusInfo.label}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 ml-2">
        {!isPending && (
          <PokeButton
            targetUserId={friend.userId}
            myUserId={myUserId}
            myPoints={myPoints}
            pokeCooldownEndsAt={friend.pokeCooldownEndsAt}
          />
        )}
        <button
          onClick={() => onDelete(friend.userId)}
          className="p-1 text-on-surface-variant opacity-50 hover:opacity-100 hover:bg-surface-container-high transition-none"
          aria-label={isPending ? '친구 요청 취소' : '친구 삭제'}
          title={isPending ? '친구 요청 취소' : '친구 삭제'}
        >
          <Icon name="person_remove" size={16} />
        </button>
      </div>
    </div>
  );
}

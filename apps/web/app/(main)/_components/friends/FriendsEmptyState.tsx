'use client';

import { Icon } from '@/shared/components/ui/Icon';

interface FriendsEmptyStateProps {
  onAddFriends: () => void;
}

export function FriendsEmptyState({ onAddFriends }: FriendsEmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 py-4 px-3 text-center">
      <Icon name="group" size={32} className="text-on-surface-variant" />
      <p className="font-sans text-label text-on-surface-variant">아직 친구가 없어요</p>
      <button
        onClick={onAddFriends}
        className="font-mono text-label text-primary-container hover:underline"
      >
        친구 추가하기
      </button>
    </div>
  );
}

'use client';

import type { FriendListResType } from '@makeforest/types';
import { FriendCard } from './FriendCard';
import { FriendsEmptyState } from './FriendsEmptyState';
import { useFriendDeleteMutation } from '@/shared/hooks/mutations/useFriendDeleteMutation';

interface FriendsAccordionProps {
  data: FriendListResType;
  userId: string;
  myPoints: number;
  onAddFriends: () => void;
}

export function FriendsAccordion({ data, userId, myPoints, onAddFriends }: FriendsAccordionProps) {
  const deleteMutation = useFriendDeleteMutation();

  if (data.friends.length === 0) {
    return <FriendsEmptyState onAddFriends={onAddFriends} />;
  }

  return (
    <div className="max-h-64 overflow-y-auto">
      {data.friends.map((friend) => (
        <FriendCard
          key={friend.userId}
          friend={friend}
          myUserId={userId}
          myPoints={myPoints}
          onDelete={(targetUserId) => deleteMutation.mutate({ targetUserId, userId })}
        />
      ))}
    </div>
  );
}

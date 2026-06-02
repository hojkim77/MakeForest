'use client';

import { useFriendsIncomingQuery } from '@/shared/hooks/queries/useFriendsQuery';
import { FriendSearchPanel } from './FriendSearchPanel';
import { IncomingRequestsList } from './IncomingRequestsList';
import { Divider } from '@/shared/components/ui/Divider';

interface AddFriendsViewProps {
  userId: string;
}

export function AddFriendsView({ userId }: AddFriendsViewProps) {
  const { data: incomingData } = useFriendsIncomingQuery(userId);

  return (
    <div>
      <FriendSearchPanel userId={userId} />
      {incomingData && incomingData.requests.length > 0 && (
        <div>
          <Divider className="mt-1" />
          <p className="px-3 py-1 font-mono text-[11px] text-on-surface-variant uppercase tracking-wider">
            받은 요청
          </p>
          <IncomingRequestsList data={incomingData} userId={userId} />
        </div>
      )}
    </div>
  );
}

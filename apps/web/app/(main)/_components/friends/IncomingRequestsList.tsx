'use client';

import type { IncomingRequestsResType } from '@makeforest/types';
import { Icon } from '@/shared/components/ui/Icon';
import { useFriendAcceptMutation } from '@/shared/hooks/mutations/useFriendAcceptMutation';
import { useFriendRejectMutation } from '@/shared/hooks/mutations/useFriendRejectMutation';
import { Button } from '@/shared/components/ui/Button';

interface IncomingRequestsListProps {
  data: IncomingRequestsResType;
  userId: string;
}

export function IncomingRequestsList({ data, userId }: IncomingRequestsListProps) {
  const acceptMutation = useFriendAcceptMutation();
  const rejectMutation = useFriendRejectMutation();

  if (data.requests.length === 0) {
    return (
      <p className="font-sans text-label text-on-surface-variant px-3 py-2">
        받은 친구 요청이 없습니다.
      </p>
    );
  }

  return (
    <div>
      {data.requests.map((req) => (
        <div
          key={req.friendshipId}
          className="flex items-center justify-between px-3 py-2 border-b border-outline-variant last:border-0"
        >
          <div className="flex flex-col min-w-0 flex-1">
            <span className="font-mono text-label text-on-surface truncate">{req.requester.nickname}</span>
            {req.requester.dongName && (
              <span className="font-sans text-[11px] text-on-surface-variant flex items-center gap-0.5">
                <Icon name="location_on" size={12} />
                {req.requester.dongName}
              </span>
            )}
          </div>
          <div className="flex gap-1 ml-2">
            <Button
              variant="ghost"
              size="sm"
              icon="check"
              disabled={acceptMutation.isPending}
              aria-label="수락"
              onClick={() => acceptMutation.mutate({ friendshipId: req.friendshipId, userId })}
            />
            <Button
              variant="ghost"
              size="sm"
              icon="close"
              disabled={rejectMutation.isPending}
              aria-label="거절"
              onClick={() => rejectMutation.mutate({ friendshipId: req.friendshipId, userId })}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

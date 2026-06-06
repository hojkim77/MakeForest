'use client';

import { useState } from 'react';
import { Icon } from '@/shared/components/ui/Icon';
import { useFriendSearchQuery } from '@/shared/hooks/queries/useFriendsQuery';
import { useFriendRequestMutation } from '@/shared/hooks/mutations/useFriendRequestMutation';
import { Button } from '@/shared/components/ui/Button';

interface FriendSearchPanelProps {
  userId: string;
}

export function FriendSearchPanel({ userId }: FriendSearchPanelProps) {
  const [query, setQuery] = useState('');

  const { data, isFetching } = useFriendSearchQuery(userId, query.trim());
  const requestMutation = useFriendRequestMutation();

  return (
    <div>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-outline-variant">
        <Icon name="search" size={16} className="text-on-surface-variant flex-shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="닉네임으로 검색"
          className="flex-1 bg-transparent font-mono text-label text-on-surface outline-none placeholder:text-on-surface-variant"
        />
        {isFetching && <Icon name="progress_activity" size={16} className="text-on-surface-variant animate-spin" />}
      </div>

      {data && query.trim().length > 0 && (
        <div className="max-h-48 overflow-y-auto">
          {data.results.length === 0 ? (
            <p className="px-3 py-2 font-sans text-label text-on-surface-variant">검색 결과가 없습니다.</p>
          ) : (
            data.results.map((user) => (
              <div
                key={user.userId}
                className="flex items-center justify-between px-3 py-2 border-b border-outline-variant last:border-0"
              >
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="font-mono text-label text-on-surface truncate">{user.nickname}</span>
                  {user.dongName && (
                    <span className="font-sans text-[11px] text-on-surface-variant">
                      {user.dongName}
                    </span>
                  )}
                </div>
                {user.relation === 'NONE' && (
                  <Button
                    size="sm"
                    loading={requestMutation.isPending}
                    className="ml-2"
                    onClick={() => requestMutation.mutate({ targetUserId: user.userId, userId })}
                  >
                    요청
                  </Button>
                )}
                {user.relation === 'PENDING_OUTGOING' && (
                  <span className="ml-2 font-mono text-[11px] text-on-surface-variant">요청 중</span>
                )}
                {user.relation === 'PENDING_INCOMING' && (
                  <span className="ml-2 font-mono text-[11px] text-on-surface-variant">받은 요청</span>
                )}
                {user.relation === 'FRIENDS' && (
                  <span className="ml-2 font-mono text-[11px] text-primary">친구</span>
                )}
                {user.relation === 'SELF' && (
                  <span className="ml-2 font-mono text-[11px] text-on-surface-variant">나</span>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

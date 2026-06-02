'use client';

import type { PokeInboxResType } from '@makeforest/types';
import { Icon } from '../Icon';

interface PokeDropdownProps {
  data: PokeInboxResType;
}

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

export function PokeDropdown({ data }: PokeDropdownProps) {
  return (
    <div className="absolute right-0 top-full mt-1 w-72 bg-surface border border-outline-variant z-50">
      <div className="px-3 py-2 border-b border-outline-variant flex items-center justify-between">
        <span className="font-mono text-label text-on-surface">알림</span>
        {data.unreadCount > 0 && (
          <span className="font-mono text-[11px] text-primary-container">
            {data.unreadCount}개 미읽음
          </span>
        )}
      </div>
      {data.items.length === 0 ? (
        <div className="px-3 py-4 text-center font-sans text-label text-on-surface-variant">
          알림이 없습니다.
        </div>
      ) : (
        <ul className="max-h-72 overflow-y-auto">
          {data.items.map((item) => (
            <li
              key={item.pokeId}
              className={[
                'flex items-start gap-2 px-3 py-2 border-b border-outline-variant last:border-0',
                !item.isRead ? 'bg-surface-container' : '',
              ].join(' ')}
            >
              <Icon name="touch_app" size={18} className="text-primary-container mt-0.5 flex-shrink-0" />
              <div className="flex flex-col min-w-0 flex-1">
                <span className="font-sans text-label text-on-surface">
                  <span className="font-mono">{item.fromUser.nickname}</span>님이 찔렀어요!
                </span>
                <span className="font-sans text-[11px] text-on-surface-variant">
                  {formatRelativeTime(item.createdAt)}
                </span>
              </div>
              {!item.isRead && (
                <span className="w-2 h-2 rounded-full bg-primary-container mt-1.5 flex-shrink-0" />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

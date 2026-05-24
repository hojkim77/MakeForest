'use client';

import type { CommunityReaction } from '@makeforest/types';
import { useReactionMutation } from '@/shared/hooks/mutations/useReactionMutation';

const EMOJIS = ['🔥', '💪', '👏'] as const;

interface Props {
  postId: string;
  reactions: CommunityReaction[];
  isLoggedIn: boolean;
  feedFilters: { period: string; sort: string; regionKey: string };
}

export function ReactionBar({ postId, reactions, isLoggedIn, feedFilters }: Props) {
  const { mutate } = useReactionMutation();

  function toggle(emoji: string) {
    if (!isLoggedIn) return;
    mutate({ postId, emoji, feedFilters });
  }

  return (
    <div className="flex gap-xs">
      {EMOJIS.map((emoji) => {
        const r = reactions.find((x) => x.emoji === emoji);
        const active = r?.myReaction ?? false;
        const count = r?.count ?? 0;
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => toggle(emoji)}
            disabled={!isLoggedIn}
            className={`flex items-center gap-xs px-sm py-xs font-mono text-label border transition-colors
              ${active
                ? 'border-primary bg-primary-container text-on-primary-container'
                : 'border-outline-variant bg-surface-container text-on-surface-variant hover:bg-surface-variant'
              }
              disabled:cursor-default disabled:opacity-60`}
          >
            <span>{emoji}</span>
            {count > 0 && <span>{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

'use client';

import type { CommunityReaction } from '@/shared/lib/communityTypes';
import { API_PATHS } from '@/shared/lib/apiPaths';

const EMOJIS = ['🔥', '💪', '👏'] as const;

interface Props {
  postId: string;
  reactions: CommunityReaction[];
  isLoggedIn: boolean;
  onUpdate: (reactions: CommunityReaction[]) => void;
}

export function ReactionBar({ postId, reactions, isLoggedIn, onUpdate }: Props) {
  async function toggle(emoji: string) {
    if (!isLoggedIn) return;

    const res = await fetch(API_PATHS.COMMUNITY_REACTIONS(postId), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji }),
    });
    if (!res.ok) return;

    const { added } = await res.json() as { added: boolean };
    onUpdate(
      reactions.map((r) =>
        r.emoji === emoji
          ? { ...r, count: r.count + (added ? 1 : -1), myReaction: added }
          : r,
      ),
    );
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
            onClick={() => void toggle(emoji)}
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

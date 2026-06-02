'use client';

import type { CommunityReaction } from '@makeforest/types';
import { useReactionMutation } from '@/shared/hooks/mutations/useReactionMutation';
import { Button } from '@/shared/components/ui/Button';

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
          <Button
            key={emoji}
            variant={active ? 'primary' : 'secondary'}
            size="sm"
            type="button"
            onClick={() => toggle(emoji)}
            disabled={!isLoggedIn}
            className="flex items-center gap-xs"
          >
            <span>{emoji}</span>
            {count > 0 && <span>{count}</span>}
          </Button>
        );
      })}
    </div>
  );
}

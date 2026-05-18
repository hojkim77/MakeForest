'use client';

import { useState } from 'react';
import { CreatureSprite } from '@/shared/components/ui/CreatureSprite';
import type { CommunityPost, CommunityReaction } from '@/shared/lib/communityTypes';
import { ReactionBar } from './ReactionBar';
import { CommentSection } from './CommentSection';

interface Props {
  post: CommunityPost;
  isLoggedIn: boolean;
}

function formatElapsed(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}시간 ${m}분`;
  return `${m}분`;
}

export function PostCard({ post, isLoggedIn }: Props) {
  const [reactions, setReactions] = useState<CommunityReaction[]>(post.reactions);

  return (
    <article className="flex flex-col gap-md p-md bg-surface-container border border-outline-variant">
      {/* Header */}
      <div className="flex items-center gap-sm">
        <CreatureSprite stage={Math.min(9, Math.max(0, post.creature.stage)) as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9} size={32} />
        <div className="flex flex-col">
          <span className="font-mono text-label text-on-surface">{post.user.nickname}</span>
          {(post.dongName ?? post.user.dongCode) && (
            <span className="font-mono text-label text-outline">{post.dongName ?? post.user.dongCode}</span>
          )}
        </div>
        <div className="ml-auto flex items-center gap-sm font-mono text-label text-outline">
          <span>💧 {post.session?.waterCount ?? 0}</span>
          {post.session && post.session.totalElapsedSec > 0 && (
            <span>⏱ {formatElapsed(post.session.totalElapsedSec)}</span>
          )}
        </div>
      </div>

      {/* Todos */}
      {post.session?.todosPublic && post.session.todos.length > 0 && (
        <ul className="flex flex-col gap-xs pl-xs">
          {post.session.todos.map((todo, i) => (
            <li key={i} className={`font-mono text-label flex items-center gap-xs ${todo.done ? 'text-outline line-through' : 'text-on-surface'}`}>
              <span>{todo.done ? '✓' : '○'}</span>
              <span>{todo.text}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Reactions */}
      <ReactionBar
        postId={post.id}
        reactions={reactions}
        isLoggedIn={isLoggedIn}
        onUpdate={setReactions}
      />

      {/* Comments */}
      <CommentSection
        postId={post.id}
        initialCount={post.commentCount}
        isLoggedIn={isLoggedIn}
      />
    </article>
  );
}

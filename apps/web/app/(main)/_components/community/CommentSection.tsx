'use client';

import { useState } from 'react';
import type { CommunityComment } from '@/shared/lib/communityTypes';
import { API_PATHS } from '@/shared/lib/apiPaths';

interface Props {
  postId: string;
  initialCount: number;
  isLoggedIn: boolean;
}

export function CommentSection({ postId, initialCount, isLoggedIn }: Props) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [count, setCount] = useState(initialCount);

  async function load() {
    if (loaded) { setOpen(true); return; }
    const res = await fetch(API_PATHS.COMMUNITY_COMMENTS(postId));
    if (!res.ok) return;
    const data = await res.json() as CommunityComment[];
    setComments(data);
    setLoaded(true);
    setOpen(true);
  }

  function toggle() {
    if (!open) { void load(); } else { setOpen(false); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || submitting) return;
    setSubmitting(true);
    const res = await fetch(API_PATHS.COMMUNITY_COMMENTS(postId), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: input.trim() }),
    });
    setSubmitting(false);
    if (!res.ok) return;
    const comment = await res.json() as CommunityComment;
    setComments((prev) => [...prev, comment]);
    setCount((c) => c + 1);
    setInput('');
  }

  return (
    <div className="flex flex-col gap-sm">
      <button
        type="button"
        onClick={toggle}
        className="font-mono text-label text-on-surface-variant hover:text-on-surface text-left"
      >
        댓글 {count > 0 ? count : ''}
      </button>

      {open && (
        <div className="flex flex-col gap-xs pl-sm border-l border-outline-variant">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-sm">
              <span className="font-mono text-label text-primary shrink-0">{c.user.nickname}</span>
              <span className="font-mono text-label text-on-surface">{c.content}</span>
            </div>
          ))}

          {isLoggedIn && (
            <form onSubmit={(e) => void submit(e)} className="flex gap-xs mt-xs">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="댓글 작성..."
                className="flex-1 bg-surface-container border border-outline-variant px-sm py-xs font-mono text-label text-on-surface outline-none focus:border-primary"
              />
              <button
                type="submit"
                disabled={!input.trim() || submitting}
                className="px-sm py-xs bg-primary text-on-primary font-mono text-label disabled:opacity-50"
              >
                등록
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

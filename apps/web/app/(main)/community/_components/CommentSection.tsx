'use client';

import { useState } from 'react';

function formatCommentTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return '방금';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}시간 전`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}일 전`;
}
import { useCommentsQuery } from '@/shared/hooks/queries/useCommentsQuery';
import { useAddCommentMutation, useDeleteCommentMutation } from '@/shared/hooks/mutations/useCommentMutation';

interface Props {
  postId: string;
  initialCount: number;
  isLoggedIn: boolean;
}

export function CommentSection({ postId, initialCount, isLoggedIn }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');

  const { data: comments = [], isFetching, isFetched } = useCommentsQuery(postId, open);
  const count = open && isFetched ? comments.length : initialCount;
  const { mutate: addComment, isPending: submitting } = useAddCommentMutation();
  const { mutate: deleteComment } = useDeleteCommentMutation();

  function toggle() {
    setOpen((v) => !v);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || submitting) return;
    addComment(
      { postId, content: input.trim() },
      {
        onSuccess: () => {
          setInput('');
        },
      },
    );
  }

  function handleDelete(commentId: string) {
    deleteComment({ postId, commentId });
  }

  return (
    <div className="flex flex-col gap-sm">
      <button
        type="button"
        onClick={toggle}
        className="font-mono text-label text-on-surface-variant hover:text-on-surface text-left"
      >
        댓글 {open ? '▴' : '▾'} {count > 0 ? `(${count})` : ''}
      </button>

      {open && (
        <div className="flex flex-col gap-sm pl-sm border-l border-outline-variant">
          {isFetching && comments.length === 0 && (
            <p className="font-mono text-label text-outline">불러오는 중...</p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="flex flex-col gap-xs">
              <div className="flex items-center gap-sm">
                <span className="font-mono text-label text-primary shrink-0">{c.user.nickname}</span>
                <span className="font-mono text-label text-outline">{formatCommentTime(c.createdAt)}</span>
                {c.isMyComment && (
                  <button
                    type="button"
                    onClick={() => handleDelete(c.id)}
                    className="font-mono text-label text-outline hover:text-error ml-auto shrink-0"
                  >
                    삭제
                  </button>
                )}
              </div>
              <span className="font-mono text-label text-on-surface">{c.content}</span>
            </div>
          ))}

          {isLoggedIn && (
            <form onSubmit={(e) => submit(e)} className="flex gap-xs mt-xs">
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

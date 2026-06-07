'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from '@/shared/lib/toast';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { useTodosQuery } from '@/shared/hooks/queries/useTodosQuery';
import { useCreateTodoMutation, useUpdateTodoMutation, useDeleteTodoMutation } from '@/shared/hooks/mutations/useTodosMutation';

export function TodoCardContent() {
  const { data: authSession } = useSession();
  const userId = authSession?.user?.id ?? null;

  const { data: todos = [] } = useTodosQuery({ userId });
  const createMutation = useCreateTodoMutation(userId);
  const updateMutation = useUpdateTodoMutation(userId);
  const deleteMutation = useDeleteTodoMutation(userId);

  const [input, setInput] = useState('');

  function handleAdd() {
    const text = input.trim();
    if (!text || !userId) return;
    createMutation.mutate({ text }, {
      onError: () => toast.error('추가에 실패했어요. 다시 시도해주세요.'),
    });
    setInput('');
  }

  function handleToggle(id: string, done: boolean) {
    updateMutation.mutate({ id, done: !done }, {
      onError: () => toast.error('저장에 실패했어요. 다시 시도해주세요.'),
    });
  }

  function handleDelete(id: string) {
    deleteMutation.mutate({ id }, {
      onError: () => toast.error('삭제에 실패했어요. 다시 시도해주세요.'),
    });
  }

  return (
    <>
      {/* 할일 목록 */}
      <div className="flex flex-col divide-y divide-outline-variant max-h-48 overflow-y-auto">
        {todos.length === 0 && (
          <p className="px-md py-sm font-mono text-label text-on-surface-variant">
            할 일을 추가해보세요
          </p>
        )}
        {todos.map((t) => (
          <div key={t.id} className="flex items-center gap-sm px-md py-xs">
            <button
              type="button"
              onClick={() => handleToggle(t.id, t.done)}
              className="font-mono text-label text-on-surface-variant shrink-0 w-4 text-center"
            >
              {t.done ? '✓' : '○'}
            </button>
            <span className={`font-mono text-label flex-1 ${t.done ? 'line-through text-on-surface-variant' : 'text-on-surface'}`}>
              {t.text}
            </span>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => handleDelete(t.id)}
              className="shrink-0"
            >
              삭제
            </Button>
          </div>
        ))}
      </div>

      {/* 입력 */}
      <div className="flex gap-xs px-md py-sm border-t border-outline">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
          placeholder="할 일 추가..."
          className="flex-1 py-xs text-label"
        />
        <Button
          variant="secondary"
          size="sm"
          type="button"
          onClick={handleAdd}
          disabled={!input.trim() || createMutation.isPending}
        >
          추가
        </Button>
      </div>
    </>
  );
}

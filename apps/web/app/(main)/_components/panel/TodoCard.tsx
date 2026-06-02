'use client';

import { useState } from 'react';
import { useTodoStore, useTimerStore, selectIsDirty } from '@/shared/store';
import { api } from '@/shared/lib/api';
import { API_PATHS } from '@/shared/lib/apiPaths';
import { toast } from '@/shared/lib/toast';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';

export function TodoCardContent() {
  const { todos, addTodo, toggleTodo, removeTodo, markSaved } = useTodoStore();
  const isDirty = useTodoStore(selectIsDirty);
  const sessionId = useTimerStore((s) => s.sessionId);

  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);

  function handleAdd() {
    const text = input.trim();
    if (!text) return;
    addTodo(text);
    setInput('');
  }

  async function handleSave() {
    if (!isDirty || saving) return;
    setSaving(true);
    try {
      if (sessionId) {
        await api.patch(API_PATHS.SESSION_TODOS(sessionId), { todos });
      }
      markSaved();
    } catch {
      toast.error('저장에 실패했어요. 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* 할일 목록 */}
      <div className="flex flex-col divide-y divide-outline-variant max-h-48 overflow-y-auto">
        {todos.length === 0 && (
          <p className="px-md py-sm font-mono text-label text-outline">
            할 일을 추가해보세요
          </p>
        )}
        {todos.map((t) => (
          <div key={t.id} className="flex items-center gap-sm px-md py-xs">
            <button
              type="button"
              onClick={() => toggleTodo(t.id)}
              className="font-mono text-label text-on-surface-variant shrink-0 w-4 text-center"
            >
              {t.done ? '✓' : '○'}
            </button>
            <span className={`font-mono text-label flex-1 ${t.done ? 'line-through text-outline' : 'text-on-surface'}`}>
              {t.text}
            </span>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => removeTodo(t.id)}
              className="shrink-0"
            >
              삭제
            </Button>
          </div>
        ))}
      </div>

      {/* 입력 */}
      <div className="flex gap-xs px-md py-sm border-t border-outline-variant">
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
          disabled={!input.trim()}
        >
          추가
        </Button>
      </div>

      {/* 저장 */}
      <div className="flex items-center justify-between px-md py-sm border-t border-outline-variant">
        {!sessionId && isDirty && (
          <span className="font-mono text-label text-outline text-xs">
            세션 시작 후 서버에 저장돼요
          </span>
        )}
        <Button
          type="button"
          loading={saving}
          disabled={!isDirty || saving}
          size="sm"
          className="ml-auto"
          onClick={() => void handleSave()}
        >
          저장
        </Button>
      </div>
    </>
  );
}

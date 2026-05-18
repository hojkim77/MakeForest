'use client';

import { useTodoStore, selectIsDirty } from '@/shared/store';
import { TodoCardContent } from './TodoCard';
import { TabButton } from './TabButton';

export function TodoTab() {
  const todoOpen = useTodoStore((s) => s.open);
  const setTodoOpen = useTodoStore((s) => s.setOpen);
  const isTodoDirty = useTodoStore(selectIsDirty);
  const todoCount = useTodoStore((s) => s.todos.length);

  return (
    <div className="relative mt-auto">
      <TabButton
        label="오늘 할일"
        active={todoOpen}
        onClick={() => setTodoOpen(!todoOpen)}
        {...(isTodoDirty ? { badge: '●' } : todoCount > 0 ? { badge: String(todoCount) } : {})}
      />
      {todoOpen && (
        <div className="absolute left-7 bottom-0 w-64 bg-surface-container border border-outline-variant overflow-hidden">
          <TodoCardContent />
        </div>
      )}
    </div>
  );
}

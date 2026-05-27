'use client';

import { useTodoStore, selectIsDirty } from '@/shared/store';
import { TodoCardContent } from './TodoCard';
import { TabButton } from './TabButton';
import { TabPopup } from './TabPopup';

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
        <TabPopup anchor="bottom">
          <TodoCardContent />
        </TabPopup>
      )}
    </div>
  );
}

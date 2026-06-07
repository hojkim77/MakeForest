'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useTodosQuery } from '@/shared/hooks/queries/useTodosQuery';
import { TodoCardContent } from './TodoCard';
import { TabButton } from './TabButton';
import { TabPopup } from './TabPopup';

export function TodoTab() {
  const [open, setOpen] = useState(false);
  const { data: authSession } = useSession();
  const userId = authSession?.user?.id ?? null;
  const { data: todos = [] } = useTodosQuery({ userId });

  return (
    <div className="relative mt-auto">
      <TabButton
        label="오늘 할일"
        active={open}
        onClick={() => setOpen(!open)}
        {...(todos.length > 0 ? { badge: String(todos.length) } : {})}
      />
      {open && (
        <TabPopup anchor="bottom">
          <TodoCardContent />
        </TabPopup>
      )}
    </div>
  );
}

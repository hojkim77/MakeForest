'use client';

import { useTimerStore } from '@/store';

export function Panel() {
  const { status, elapsedSec, durationSec, todos } = useTimerStore();
  const remaining = durationSec - elapsedSec;
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');

  return (
    <div className="flex flex-col h-full p-4 gap-6">
      <div className="text-center">
        <div className="text-5xl font-mono font-bold tracking-widest">{mm}:{ss}</div>
        <div className="text-sm text-gray-400 mt-1">{status}</div>
      </div>

      <ul className="flex-1 overflow-y-auto space-y-2">
        {todos.map((todo) => (
          <li key={todo.id} className="flex items-center gap-2 text-sm">
            <span className={todo.done ? 'line-through text-gray-500' : ''}>{todo.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

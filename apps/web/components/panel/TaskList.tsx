'use client';

import { useState, type KeyboardEvent } from 'react';
import { Icon } from '@/components/ui/Icon';
import type { Todo } from '@makeforest/types';

interface TaskListProps {
  todos: Todo[];
  onToggle: (id: string) => void;
  onAdd: (text: string) => void;
}

export function TaskList({ todos, onToggle, onAdd }: TaskListProps) {
  const [input, setInput] = useState('');
  const doneCount = todos.filter((t) => t.done).length;

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter' && input.trim()) {
      onAdd(input.trim());
      setInput('');
    }
  }

  return (
    <div className="flex flex-col gap-md">
      {/* Header */}
      <div className="flex justify-between items-end border-b border-outline-variant pb-xs">
        <h2 className="font-mono text-label uppercase tracking-widest text-outline">
          Today&apos;s Focus
        </h2>
        <span className="font-mono text-pixel-stat text-primary">
          {doneCount} / {todos.length}
        </span>
      </div>

      {/* List */}
      {todos.length > 0 && (
        <ul className="flex flex-col border-l border-outline-variant">
          {todos.map((todo) => (
            <li
              key={todo.id}
              className="flex items-center gap-md p-md border-b border-outline-variant hover:bg-surface-container-high transition-none cursor-pointer"
              onClick={() => onToggle(todo.id)}
            >
              <Icon
                name={todo.done ? 'check_box' : 'check_box_outline_blank'}
                filled={todo.done}
                size={20}
                className={todo.done ? 'text-primary' : 'text-outline'}
              />
              <span
                className={[
                  'font-sans text-body-md flex-1',
                  todo.done ? 'line-through text-outline' : 'text-on-surface',
                ].join(' ')}
              >
                {todo.text}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Add task input */}
      <div className="flex items-center gap-xs border border-outline-variant bg-surface-container-lowest focus-within:border-outline">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="할 일 추가 (Enter)"
          className="flex-1 px-md py-sm bg-transparent font-sans text-body-md text-on-surface placeholder:text-outline outline-none"
        />
        {input.trim() && (
          <button
            onClick={() => { onAdd(input.trim()); setInput(''); }}
            className="px-sm text-primary"
            aria-label="추가"
          >
            <Icon name="add" size={18} />
          </button>
        )}
      </div>
    </div>
  );
}

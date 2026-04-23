import { create } from 'zustand';
import type { SessionStatus, Todo } from '@makeforest/types';

interface TimerState {
  sessionId: string | null;
  status: SessionStatus | 'IDLE';
  durationSec: number;
  elapsedSec: number;
  todos: Todo[];
  setSession: (id: string, durationSec: number) => void;
  setStatus: (status: SessionStatus | 'IDLE') => void;
  tick: () => void;
  addTodo: (text: string) => void;
  toggleTodo: (id: string) => void;
  removeTodo: (id: string) => void;
  reset: () => void;
}

export const useTimerStore = create<TimerState>((set) => ({
  sessionId: null,
  status: 'IDLE',
  durationSec: 25 * 60,
  elapsedSec: 0,
  todos: [],

  setSession: (id, durationSec) => set({ sessionId: id, durationSec, elapsedSec: 0 }),
  setStatus: (status) => set({ status }),
  tick: () => set((s) => ({ elapsedSec: s.elapsedSec + 1 })),

  addTodo: (text) =>
    set((s) => ({
      todos: [...s.todos, { id: crypto.randomUUID(), text, done: false }],
    })),
  toggleTodo: (id) =>
    set((s) => ({
      todos: s.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    })),
  removeTodo: (id) =>
    set((s) => ({ todos: s.todos.filter((t) => t.id !== id) })),

  reset: () =>
    set({ sessionId: null, status: 'IDLE', elapsedSec: 0, todos: [] }),
}));

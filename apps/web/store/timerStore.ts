import { create } from 'zustand';
import type { SessionStatus, Todo } from '@makeforest/types';

interface TimerState {
  sessionId: string | null;
  status: SessionStatus | 'IDLE';
  elapsedSec: number;
  todos: Todo[];
  setSession: (id: string) => void;
  start: () => void;
  pause: () => void;
  tick: () => void;
  resetWaterProgress: () => void;
  addTodo: (text: string) => void;
  toggleTodo: (id: string) => void;
  removeTodo: (id: string) => void;
  reset: () => void;
}

let _interval: ReturnType<typeof setInterval> | null = null;

export const useTimerStore = create<TimerState>((set, get) => ({
  sessionId: null,
  status: 'IDLE',
  elapsedSec: 0,
  todos: [],

  setSession: (id) => set({ sessionId: id }),

  start: () => {
    set({ status: 'RUNNING' });
    if (_interval) clearInterval(_interval);
    _interval = setInterval(() => get().tick(), 1000);
  },

  pause: () => {
    set({ status: 'PAUSED' });
    if (_interval) { clearInterval(_interval); _interval = null; }
  },

  tick: () => set((s) => ({ elapsedSec: s.elapsedSec + 1 })),

  // 물주기 성공 후 다음 30분 주기 리셋
  resetWaterProgress: () => set((s) => ({
    elapsedSec: Math.max(0, s.elapsedSec - 1800),
  })),

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

  reset: () => {
    if (_interval) { clearInterval(_interval); _interval = null; }
    set({ sessionId: null, status: 'IDLE', elapsedSec: 0, todos: [] });
  },
}));

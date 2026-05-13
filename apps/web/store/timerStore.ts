import { create } from 'zustand';
import type { Todo } from '@makeforest/types';

interface TimerState {
  sessionId: string | null;
  startedAt: number | null;    // 현재 사이클 시작 Unix ms (서버 응답값)
  status: 'idle' | 'running' | 'complete';
  cycleCount: number;           // 0이면 "시작", >0이면 "재개"
  todos: Todo[];
  startSession: (sessionId: string, startedAtMs: number) => void;
  complete: () => void;
  reset: () => void;
  addTodo: (text: string) => void;
  toggleTodo: (id: string) => void;
  removeTodo: (id: string) => void;
}

let _interval: ReturnType<typeof setInterval> | null = null;

const CYCLE_SEC = Number(process.env.NEXT_PUBLIC_CYCLE_SEC ?? 1800);
const CYCLE_MS = CYCLE_SEC * 1000;

export const useTimerStore = create<TimerState>((set, get) => ({
  sessionId: null,
  startedAt: null,
  status: 'idle',
  cycleCount: 0,
  todos: [],

  startSession: (sessionId, startedAtMs) => {
    if (_interval) clearInterval(_interval);
    set({ sessionId, startedAt: startedAtMs, status: 'running' });
    _interval = setInterval(() => {
      const { startedAt, status } = get();
      if (status !== 'running' || !startedAt) return;
      if (Date.now() - startedAt >= CYCLE_MS) {
        get().complete();
      } else {
        // 리렌더 트리거 (elapsedSec 표시용)
        set({});
      }
    }, 1000);
  },

  complete: () => {
    if (_interval) { clearInterval(_interval); _interval = null; }
    set({ status: 'complete' });
  },

  reset: () => {
    if (_interval) { clearInterval(_interval); _interval = null; }
    set((s) => ({
      sessionId: s.sessionId,   // sessionId는 유지 (재개 시 같은 세션)
      startedAt: null,
      status: 'idle',
      cycleCount: s.cycleCount + 1,
    }));
  },

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
}));

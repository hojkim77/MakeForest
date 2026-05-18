import { create } from 'zustand';

interface TimerState {
  sessionId: string | null;
  startedAt: number | null;    // 현재 사이클 시작 Unix ms (서버 응답값)
  status: 'idle' | 'running' | 'complete';
  cycleCount: number;           // 0이면 "시작", >0이면 "재개"
  startSession: (sessionId: string, startedAtMs: number) => void;
  complete: () => void;
  reset: () => void;
}

let _interval: ReturnType<typeof setInterval> | null = null;

export const CYCLE_SEC = Number(process.env.NEXT_PUBLIC_CYCLE_SEC ?? 1800);
export const CYCLE_MS = CYCLE_SEC * 1000;

export const useTimerStore = create<TimerState>((set, get) => ({
  sessionId: null,
  startedAt: null,
  status: 'idle',
  cycleCount: 0,

  startSession: (sessionId, startedAtMs) => {
    if (_interval) clearInterval(_interval);
    set({ sessionId, startedAt: startedAtMs, status: 'running' });
    _interval = setInterval(() => {
      const { startedAt, status } = get();
      if (status !== 'running' || !startedAt) return;
      if (Date.now() - startedAt >= CYCLE_MS) {
        get().complete();
      } else {
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
      sessionId: s.sessionId,
      startedAt: null,
      status: 'idle',
      cycleCount: s.cycleCount + 1,
    }));
  },
}));

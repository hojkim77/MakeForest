import { useTimerStore } from '../timerStore';

beforeEach(() => {
  jest.useFakeTimers();
  useTimerStore.getState().reset();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('start / tick', () => {
  it('start 후 1초마다 elapsedSec 증가, status=RUNNING', () => {
    useTimerStore.getState().start();
    expect(useTimerStore.getState().status).toBe('RUNNING');
    jest.advanceTimersByTime(3000);
    expect(useTimerStore.getState().elapsedSec).toBe(3);
  });
});

describe('pause', () => {
  it('pause 후 elapsedSec 고정, status=PAUSED', () => {
    useTimerStore.getState().start();
    jest.advanceTimersByTime(2000);
    useTimerStore.getState().pause();
    expect(useTimerStore.getState().status).toBe('PAUSED');
    jest.advanceTimersByTime(5000);
    expect(useTimerStore.getState().elapsedSec).toBe(2);
  });
});

describe('start → pause → start (재시작)', () => {
  it('재시작 시 elapsedSec 이어받음 (초기화 없음)', () => {
    useTimerStore.getState().start();
    jest.advanceTimersByTime(2000);
    useTimerStore.getState().pause();
    useTimerStore.getState().start();
    jest.advanceTimersByTime(3000);
    expect(useTimerStore.getState().elapsedSec).toBe(5);
  });
});

describe('double start 방어', () => {
  it('start 두 번 호출해도 interval 하나만 동작', () => {
    useTimerStore.getState().start();
    useTimerStore.getState().start();
    jest.advanceTimersByTime(3000);
    expect(useTimerStore.getState().elapsedSec).toBe(3);
  });
});

describe('resetWaterProgress — 30분(1800초) 리셋', () => {
  it('elapsedSec=3000 → 1200', () => {
    useTimerStore.setState({ elapsedSec: 3000 });
    useTimerStore.getState().resetWaterProgress();
    expect(useTimerStore.getState().elapsedSec).toBe(1200);
  });

  it('elapsedSec=1800 → 0 (정확히 경계)', () => {
    useTimerStore.setState({ elapsedSec: 1800 });
    useTimerStore.getState().resetWaterProgress();
    expect(useTimerStore.getState().elapsedSec).toBe(0);
  });

  it('elapsedSec=500 → 0 (음수 클램프)', () => {
    useTimerStore.setState({ elapsedSec: 500 });
    useTimerStore.getState().resetWaterProgress();
    expect(useTimerStore.getState().elapsedSec).toBe(0);
  });
});

describe('reset', () => {
  it('모든 state 초기화 + interval 클리어', () => {
    useTimerStore.getState().setSession('abc');
    useTimerStore.getState().start();
    jest.advanceTimersByTime(5000);
    useTimerStore.getState().reset();

    const state = useTimerStore.getState();
    expect(state.sessionId).toBeNull();
    expect(state.status).toBe('IDLE');
    expect(state.elapsedSec).toBe(0);
    expect(state.todos).toHaveLength(0);

    // interval이 클리어됐는지 확인 — reset 후 시간이 지나도 tick 없음
    jest.advanceTimersByTime(5000);
    expect(useTimerStore.getState().elapsedSec).toBe(0);
  });
});

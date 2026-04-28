import { useTimerStore } from '../timerStore';

beforeEach(() => {
  jest.useFakeTimers();
  useTimerStore.getState().reset();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('start / tick', () => {
  it('start 후 1초마다 elapsedSec 증가', () => {
    useTimerStore.getState().start();
    jest.advanceTimersByTime(3000);
    expect(useTimerStore.getState().elapsedSec).toBe(3);
  });

  it('status가 RUNNING으로 변경', () => {
    useTimerStore.getState().start();
    expect(useTimerStore.getState().status).toBe('RUNNING');
  });
});

describe('pause', () => {
  it('pause 후 elapsedSec 고정', () => {
    useTimerStore.getState().start();
    jest.advanceTimersByTime(2000);
    useTimerStore.getState().pause();
    jest.advanceTimersByTime(5000);
    expect(useTimerStore.getState().elapsedSec).toBe(2);
  });

  it('status가 PAUSED로 변경', () => {
    useTimerStore.getState().start();
    useTimerStore.getState().pause();
    expect(useTimerStore.getState().status).toBe('PAUSED');
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
  it('모든 state 초기화', () => {
    useTimerStore.getState().setSession('abc');
    useTimerStore.getState().start();
    jest.advanceTimersByTime(5000);
    useTimerStore.getState().reset();

    const state = useTimerStore.getState();
    expect(state.sessionId).toBeNull();
    expect(state.status).toBe('IDLE');
    expect(state.elapsedSec).toBe(0);
    expect(state.todos).toHaveLength(0);
  });

  it('reset 후 interval 클리어 — tick 없음', () => {
    useTimerStore.getState().start();
    useTimerStore.getState().reset();
    jest.advanceTimersByTime(5000);
    expect(useTimerStore.getState().elapsedSec).toBe(0);
  });
});

describe('todo 관리', () => {
  it('addTodo → toggleTodo → removeTodo 라운드트립', () => {
    useTimerStore.getState().addTodo('테스트 작성');
    const { todos } = useTimerStore.getState();
    expect(todos).toHaveLength(1);
    expect(todos[0]!.text).toBe('테스트 작성');
    expect(todos[0]!.done).toBe(false);

    useTimerStore.getState().toggleTodo(todos[0]!.id);
    expect(useTimerStore.getState().todos[0]!.done).toBe(true);

    useTimerStore.getState().removeTodo(todos[0]!.id);
    expect(useTimerStore.getState().todos).toHaveLength(0);
  });
});

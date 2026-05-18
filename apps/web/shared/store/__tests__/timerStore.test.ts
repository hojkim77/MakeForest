import { useTimerStore } from '../timerStore';

beforeEach(() => {
  jest.useFakeTimers();
  useTimerStore.getState().reset();
  // reset 후 cycleCount 초기화
  useTimerStore.setState({ cycleCount: 0 });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('startSession', () => {
  it('startSession 후 status=running, startedAt 저장', () => {
    const now = Date.now();
    useTimerStore.getState().startSession('sess-1', now);
    const state = useTimerStore.getState();
    expect(state.status).toBe('running');
    expect(state.sessionId).toBe('sess-1');
    expect(state.startedAt).toBe(now);
  });

  it('double startSession 호출해도 interval 하나만 동작', () => {
    const now = Date.now();
    useTimerStore.getState().startSession('sess-1', now - 1000);
    useTimerStore.getState().startSession('sess-2', now);
    expect(useTimerStore.getState().status).toBe('running');
  });
});

describe('complete', () => {
  it('complete 후 status=complete, interval 정지', () => {
    useTimerStore.getState().startSession('sess-1', Date.now());
    useTimerStore.getState().complete();
    expect(useTimerStore.getState().status).toBe('complete');
  });
});

describe('자동 완료 (30분 경과)', () => {
  it('30분 경과 시 status=complete로 전환', () => {
    const now = Date.now();
    jest.setSystemTime(now);
    useTimerStore.getState().startSession('sess-1', now);

    // 30분 후로 시간 이동
    jest.setSystemTime(now + 30 * 60 * 1000 + 1000);
    jest.advanceTimersByTime(31 * 1000); // interval 31번 실행

    expect(useTimerStore.getState().status).toBe('complete');
  });
});

describe('reset', () => {
  it('reset 후 status=idle, startedAt=null, cycleCount 증가', () => {
    useTimerStore.getState().startSession('sess-1', Date.now());
    useTimerStore.getState().complete();
    useTimerStore.getState().reset();

    const state = useTimerStore.getState();
    expect(state.status).toBe('idle');
    expect(state.startedAt).toBeNull();
    expect(state.cycleCount).toBe(1);
    // sessionId는 재개를 위해 유지
    expect(state.sessionId).toBe('sess-1');
  });

  it('reset 후 시간이 지나도 더 이상 complete 전환 없음', () => {
    useTimerStore.getState().startSession('sess-1', Date.now());
    useTimerStore.getState().reset();
    jest.advanceTimersByTime(35 * 60 * 1000);
    expect(useTimerStore.getState().status).toBe('idle');
  });
});


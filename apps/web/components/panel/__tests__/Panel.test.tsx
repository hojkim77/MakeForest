import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Panel } from '../Panel';
import { useTimerStore } from '@/store';

// ── Mock: next-auth ──────────────────────────────────────────────────────────
jest.mock('next-auth/react', () => ({ useSession: jest.fn() }));
import { useSession } from 'next-auth/react';
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

// ── Mock: mapStore ───────────────────────────────────────────────────────────
let mockMapState = { focusedRegionCode: null as string | null, focusRegion: jest.fn() };

jest.mock('@/store/mapStore', () => ({
  useMapStore: () => mockMapState,
}));

// ── Mock: 하위 컴포넌트 ──────────────────────────────────────────────────────
jest.mock('../WaterToast', () => ({ WaterToast: () => null }));
jest.mock('../NeighborhoodSearch', () => ({ NeighborhoodSearch: () => null }));
jest.mock('../SloganSection', () => ({ SloganSection: () => null }));
jest.mock('../NeighborhoodStats', () => ({ NeighborhoodStats: () => null }));
jest.mock('../TaskList', () => ({ TaskList: () => null }));
jest.mock('../LoginPrompt', () => ({ LoginPrompt: () => <div>로그인이 필요합니다</div> }));
jest.mock('../CreatureSection', () => ({ CreatureSection: () => null }));

jest.mock('../TimerWaterSection', () => ({
  TimerWaterSection: ({
    status,
    canWater,
    autoPaused,
    onStart,
    onStop,
    onResume,
    onWater,
  }: {
    status: string;
    canWater: boolean;
    autoPaused?: boolean;
    onStart: () => void;
    onStop: () => void;
    onResume: () => void;
    onWater: () => void;
  }) => (
    <div>
      {status === 'IDLE' && (
        <button data-testid="start-btn" onClick={onStart}>시작</button>
      )}
      {status === 'RUNNING' && (
        <button data-testid="stop-btn" onClick={onStop}>중지</button>
      )}
      {status === 'PAUSED' && (
        <button data-testid="resume-btn" onClick={onResume} disabled={autoPaused}>재개</button>
      )}
      <button onClick={onWater} disabled={!canWater} data-testid="water-btn">물주기</button>
    </div>
  ),
}));

// ── Mock: EventSource ────────────────────────────────────────────────────────
class MockEventSource {
  static instances: MockEventSource[] = [];
  listeners: Record<string, (e: MessageEvent) => void> = {};
  close = jest.fn();
  constructor(public url: string) { MockEventSource.instances.push(this); }
  addEventListener(type: string, cb: (e: MessageEvent) => void) { this.listeners[type] = cb; }
  triggerEvent(type: string, data: object) {
    this.listeners[type]?.({ data: JSON.stringify(data) } as MessageEvent);
  }
}
(global as any).EventSource = MockEventSource;

// ── Mock: fetch ──────────────────────────────────────────────────────────────
const mockFetch = jest.fn();
global.fetch = mockFetch;

// ── 헬퍼 ─────────────────────────────────────────────────────────────────────
function loginSession(regionCode = '11') {
  mockUseSession.mockReturnValue({
    data: { user: { id: 'user1', name: '테스트', regionCode }, expires: '' },
    status: 'authenticated',
    update: jest.fn(),
  });
}

function setupDefaultFetch() {
  mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
    if (url.includes('/api/creature/'))
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ stage: 0, waterCount: 0 }) });
    if (url.includes('/api/water/me'))
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ waterCount: 0 }) });
    if (url === '/api/sessions' && opts?.method === 'POST')
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ sessionId: 'sess-1' }) });
    if (url.includes('/api/sessions/') && opts?.method === 'PATCH')
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    if (url === '/api/water' && opts?.method === 'POST')
      return Promise.resolve({
        ok: true, json: () => Promise.resolve({
          myWaterCount: 1,
          creature: { stage: 1, waterCount: 5 },
        })
      });
    if (url === '/api/push/notify' && opts?.method === 'POST')
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ sent: 1 }) });
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
}

beforeEach(() => {
  mockMapState = { focusedRegionCode: null, focusRegion: jest.fn() };
  MockEventSource.instances = [];
  mockFetch.mockReset();
  useTimerStore.getState().reset();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

// ─────────────────────────────────────────────────────────────────────────────

describe('비로그인 상태', () => {
  it('LoginPrompt 노출, 타이머 없음', async () => {
    mockUseSession.mockReturnValue({ data: null, status: 'unauthenticated', update: jest.fn() });
    setupDefaultFetch();
    render(<Panel />);
    await waitFor(() => expect(screen.getByText(/로그인이 필요합니다/)).toBeInTheDocument());
    expect(screen.queryByTestId('start-btn')).not.toBeInTheDocument();
  });
});

describe('타이머 시작', () => {
  it('시작 버튼 클릭 → POST /api/sessions 호출', async () => {
    loginSession();
    setupDefaultFetch();
    render(<Panel />);

    await waitFor(() => screen.getByTestId('start-btn'));
    await act(async () => { fireEvent.click(screen.getByTestId('start-btn')); });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/sessions',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('응답의 sessionId가 timerStore에 저장됨', async () => {
    loginSession();
    setupDefaultFetch();
    render(<Panel />);

    await waitFor(() => screen.getByTestId('start-btn'));
    await act(async () => { fireEvent.click(screen.getByTestId('start-btn')); });

    expect(useTimerStore.getState().sessionId).toBe('sess-1');
  });
});

describe('타이머 중지', () => {
  it('중지 버튼 클릭 → PATCH /api/sessions/:id 호출', async () => {
    loginSession();
    setupDefaultFetch();
    useTimerStore.setState({ status: 'RUNNING', sessionId: 'sess-1' });
    render(<Panel />);

    await waitFor(() => screen.getByTestId('stop-btn'));
    await act(async () => { fireEvent.click(screen.getByTestId('stop-btn')); });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/sessions/'),
      expect.objectContaining({ method: 'PATCH' }),
    );
  });
});

describe('타이머 재개', () => {
  it('재개 버튼 클릭 → PATCH resume 호출', async () => {
    loginSession();
    setupDefaultFetch();
    useTimerStore.setState({ status: 'PAUSED', sessionId: 'sess-1', elapsedSec: 900 });
    render(<Panel />);

    await waitFor(() => screen.getByTestId('resume-btn'));
    await act(async () => { fireEvent.click(screen.getByTestId('resume-btn')); });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/sessions/sess-1'),
      expect.objectContaining({
        method: 'PATCH',
        body: expect.stringContaining('"action":"resume"'),
      }),
    );
    expect(useTimerStore.getState().status).toBe('RUNNING');
  });
});

describe('물주기 버튼 활성화 조건 (canWater)', () => {
  it('타이머 중지 상태 → 물주기 버튼 disabled', async () => {
    loginSession();
    setupDefaultFetch();
    useTimerStore.setState({ status: 'PAUSED', elapsedSec: 3600 });
    render(<Panel />);

    await waitFor(() => screen.getByTestId('water-btn'));
    expect(screen.getByTestId('water-btn')).toBeDisabled();
  });

  it('30분 미달 → 물주기 버튼 disabled', async () => {
    loginSession();
    setupDefaultFetch();
    useTimerStore.setState({ status: 'RUNNING', elapsedSec: 1799 });
    render(<Panel />);

    await waitFor(() => screen.getByTestId('water-btn'));
    expect(screen.getByTestId('water-btn')).toBeDisabled();
  });

  it('RUNNING + 30분 달성 → 물주기 버튼 활성화', async () => {
    loginSession();
    setupDefaultFetch();
    useTimerStore.setState({ status: 'RUNNING', elapsedSec: 1800 });
    render(<Panel />);

    await waitFor(() => screen.getByTestId('water-btn'));
    expect(screen.getByTestId('water-btn')).not.toBeDisabled();
  });
});

describe('물주기 성공', () => {
  it('POST /api/water 호출 후 timerStore.elapsedSec 1800 감소', async () => {
    loginSession();
    setupDefaultFetch();
    useTimerStore.setState({ status: 'RUNNING', elapsedSec: 3600, sessionId: 'sess-1' });
    render(<Panel />);

    await waitFor(() => screen.getByTestId('water-btn'));
    expect(screen.getByTestId('water-btn')).not.toBeDisabled();

    await act(async () => { fireEvent.click(screen.getByTestId('water-btn')); });

    expect(mockFetch).toHaveBeenCalledWith('/api/water', expect.objectContaining({ method: 'POST' }));
    expect(useTimerStore.getState().elapsedSec).toBe(1800);
  });
});

describe('자동 정지 (autoPaused)', () => {
  it('autoPaused=true 상태에서 재개 버튼 disabled', async () => {
    loginSession();
    setupDefaultFetch();
    useTimerStore.setState({ status: 'PAUSED', elapsedSec: 1800, autoPaused: true });
    render(<Panel />);

    await waitFor(() => screen.getByTestId('resume-btn'));
    expect(screen.getByTestId('resume-btn')).toBeDisabled();
  });

  it('autoPaused=true + elapsedSec=1800 → 물주기 버튼 활성화 (PAUSED 상태에서도)', async () => {
    loginSession();
    setupDefaultFetch();
    useTimerStore.setState({ status: 'PAUSED', elapsedSec: 1800, autoPaused: true });
    render(<Panel />);

    await waitFor(() => screen.getByTestId('water-btn'));
    expect(screen.getByTestId('water-btn')).not.toBeDisabled();
  });

  it('autoPaused 시 POST /api/push/notify 호출', async () => {
    loginSession();
    setupDefaultFetch();
    useTimerStore.setState({ status: 'RUNNING', elapsedSec: 1799, sessionId: 'sess-1' });
    render(<Panel />);

    await act(async () => {
      useTimerStore.getState().tick();
    });

    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/push/notify',
        expect.objectContaining({ method: 'POST' }),
      )
    );
  });

  it('물주기 후 autoPaused=false → 재개 버튼 활성화', async () => {
    loginSession();
    setupDefaultFetch();
    useTimerStore.setState({ status: 'PAUSED', elapsedSec: 1800, autoPaused: true, sessionId: 'sess-1' });
    render(<Panel />);

    await waitFor(() => expect(screen.getByTestId('resume-btn')).toBeDisabled());

    await act(async () => { fireEvent.click(screen.getByTestId('water-btn')); });

    await waitFor(() => expect(screen.getByTestId('resume-btn')).not.toBeDisabled());
  });
});

describe('SSE creature:update 수신', () => {
  it('creature:update 이벤트 → 오류 없이 처리', async () => {
    loginSession();
    setupDefaultFetch();
    render(<Panel />);

    await waitFor(() => MockEventSource.instances.length > 0);
    const sseInstance = MockEventSource.instances.find(es => es.url.includes('/sse/'));
    expect(sseInstance).toBeDefined();

    act(() => {
      sseInstance?.triggerEvent('creature:update', { stage: 3, waterCount: 25 });
    });

    expect(screen.getByTestId('water-btn')).toBeInTheDocument();
  });
});

describe('엿보기 모드', () => {
  it('다른 동네 선택 시 타이머 버튼 없음', async () => {
    mockMapState = { focusedRegionCode: '26', focusRegion: jest.fn() };
    loginSession('11');
    setupDefaultFetch();
    render(<Panel />);

    await waitFor(() =>
      expect(screen.queryByTestId('start-btn')).not.toBeInTheDocument()
    );
  });
});

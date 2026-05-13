import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { TimerWaterSection } from '../TimerWaterSection';
import { useTimerStore, useWaterStore } from '@/store';

// ── Mock: next-auth ──────────────────────────────────────────────────────────
jest.mock('next-auth/react', () => ({ useSession: jest.fn() }));
import { useSession } from 'next-auth/react';
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

// ── Mock: mapStore ───────────────────────────────────────────────────────────
let mockMapState = { focusedRegionCode: null as string | null, focusRegion: jest.fn() };
jest.mock('@/store/mapStore', () => ({
  useMapStore: (sel: (s: typeof mockMapState) => unknown) => sel(mockMapState),
}));

// ── Mock: Icon ───────────────────────────────────────────────────────────────
jest.mock('@/components/ui/Icon', () => ({
  Icon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

// ── Mock: fetch ──────────────────────────────────────────────────────────────
const mockFetch = jest.fn();
global.fetch = mockFetch;

function loginSession() {
  mockUseSession.mockReturnValue({
    data: { user: { id: 'user1', name: '테스트', regionCode: '11' }, expires: '' },
    status: 'authenticated',
    update: jest.fn(),
  });
}

function setupDefaultFetch() {
  mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
    if (url === '/api/sessions' && opts?.method === 'POST')
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ sessionId: 'sess-1', startedAt: new Date().toISOString() }),
      });
    if (url.includes('/api/sessions/') && opts?.method === 'PATCH')
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    if (url === '/api/water' && opts?.method === 'POST')
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ myWaterCount: 1, userCreature: { stage: 1, waterCount: 12 } }),
      });
    if (url === '/api/push/notify' && opts?.method === 'POST')
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ sent: 1 }) });
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
}

function renderSection(myRegionCode = '11') {
  return render(<TimerWaterSection myRegionCode={myRegionCode} />);
}

beforeEach(() => {
  mockMapState = { focusedRegionCode: null, focusRegion: jest.fn() };
  mockFetch.mockReset();
  mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
  useTimerStore.setState({
    sessionId: null, startedAt: null, status: 'idle', cycleCount: 0, todos: [],
  });
  useWaterStore.setState({ waterCount: 0, creatureStage: 0, growthPercent: 0, isWatering: false });
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

// ─────────────────────────────────────────────────────────────────────────────

describe('엿보기 모드', () => {
  it('다른 동네 선택 시 섹션 미렌더', () => {
    mockMapState = { focusedRegionCode: '26', focusRegion: jest.fn() };
    loginSession();
    const { container } = renderSection('11');
    expect(container.firstChild).toBeNull();
  });
});

describe('버튼 레이블 상태 전환', () => {
  it('idle + cycleCount=0 → "시작" 버튼', async () => {
    loginSession();
    renderSection();
    await waitFor(() => expect(screen.getByTestId('timer-btn')).toHaveTextContent('시작'));
  });

  it('idle + cycleCount>0 → "재개" 버튼', async () => {
    loginSession();
    useTimerStore.setState({ status: 'idle', cycleCount: 1 });
    renderSection();
    await waitFor(() => expect(screen.getByTestId('timer-btn')).toHaveTextContent('재개'));
  });

  it('complete + not watering → "물주기" 버튼', async () => {
    loginSession();
    useTimerStore.setState({ status: 'complete', sessionId: 'sess-1' });
    renderSection();
    await waitFor(() => expect(screen.getByTestId('timer-btn')).toHaveTextContent('물주기'));
    expect(screen.getByTestId('timer-btn')).not.toBeDisabled();
  });

  it('running → 버튼 disabled', async () => {
    loginSession();
    useTimerStore.setState({ status: 'running', startedAt: Date.now(), sessionId: 'sess-1' });
    renderSection();
    await waitFor(() => expect(screen.getByTestId('timer-btn')).toBeDisabled());
  });
});

describe('시작 버튼 클릭', () => {
  it('POST /api/sessions → startSession 호출', async () => {
    loginSession();
    setupDefaultFetch();
    renderSection();

    await waitFor(() => screen.getByTestId('timer-btn'));
    await act(async () => { fireEvent.click(screen.getByTestId('timer-btn')); });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/sessions',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(useTimerStore.getState().sessionId).toBe('sess-1');
    expect(useTimerStore.getState().status).toBe('running');
  });
});

describe('물주기 성공', () => {
  it('POST /api/water 호출 후 reset + waterStore 갱신', async () => {
    loginSession();
    setupDefaultFetch();
    useTimerStore.setState({ status: 'complete', sessionId: 'sess-1', startedAt: Date.now() - 1800000 });
    renderSection();

    await waitFor(() => expect(screen.getByTestId('timer-btn')).toHaveTextContent('물주기'));
    await act(async () => { fireEvent.click(screen.getByTestId('timer-btn')); });

    expect(mockFetch).toHaveBeenCalledWith('/api/water', expect.objectContaining({ method: 'POST' }));
    await waitFor(() => {
      expect(useTimerStore.getState().status).toBe('idle');
      expect(useTimerStore.getState().cycleCount).toBe(1);
      expect(useWaterStore.getState().waterCount).toBe(1);
    });
  });
});

describe('30분 완료 시 서버 PATCH + 푸시 알림', () => {
  it('status=complete 전환 시 PATCH /api/sessions/:id + POST /api/push/notify', async () => {
    loginSession();
    setupDefaultFetch();
    useTimerStore.setState({ status: 'complete', sessionId: 'sess-1' });
    renderSection();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/sessions/sess-1'),
        expect.objectContaining({ body: expect.stringContaining('"action":"complete"') }),
      );
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/push/notify',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });
});

describe('visibilitychange 탭 복귀', () => {
  it('30분 이상 경과 후 복귀 시 status=complete', async () => {
    loginSession();
    const startedAt = Date.now() - 31 * 60 * 1000;
    useTimerStore.setState({ status: 'running', startedAt, sessionId: 'sess-1' });
    renderSection();

    await act(async () => {
      Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await waitFor(() => expect(useTimerStore.getState().status).toBe('complete'));
  });
});

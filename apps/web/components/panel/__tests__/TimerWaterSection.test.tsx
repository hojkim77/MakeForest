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

// ── 헬퍼 ─────────────────────────────────────────────────────────────────────
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
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ sessionId: 'sess-1' }) });
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
  useTimerStore.getState().reset();
  useWaterStore.setState({ waterCount: 0, creatureStage: 0, growthPercent: 0, isWatering: false });
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

// ─────────────────────────────────────────────────────────────────────────────

describe('엿보기 모드', () => {
  it('다른 동네 선택 시 섹션 미렌더 (null)', () => {
    mockMapState = { focusedRegionCode: '26', focusRegion: jest.fn() };
    loginSession();
    setupDefaultFetch();
    const { container } = renderSection('11');
    expect(container.firstChild).toBeNull();
  });
});

describe('타이머 시작', () => {
  it('시작 버튼 클릭 → POST /api/sessions + sessionId 저장', async () => {
    loginSession();
    setupDefaultFetch();
    renderSection();

    await waitFor(() => screen.getByText('시작'));
    await act(async () => { fireEvent.click(screen.getByText('시작')); });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/sessions',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"durationSec":7200'),
      }),
    );
    expect(useTimerStore.getState().sessionId).toBe('sess-1');
  });
});

describe('타이머 중지', () => {
  it('중지 버튼 클릭 → PATCH /api/sessions/:id + action:pause', async () => {
    loginSession();
    setupDefaultFetch();
    useTimerStore.setState({ status: 'RUNNING', sessionId: 'sess-1' });
    renderSection();

    await waitFor(() => screen.getByText('중지'));
    await act(async () => { fireEvent.click(screen.getByText('중지')); });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/sessions/sess-1'),
      expect.objectContaining({ method: 'PATCH', body: expect.stringContaining('"action":"pause"') }),
    );
  });
});

describe('타이머 재개', () => {
  it('재개 버튼 클릭 → PATCH resume + status=RUNNING', async () => {
    loginSession();
    setupDefaultFetch();
    useTimerStore.setState({ status: 'PAUSED', sessionId: 'sess-1', elapsedSec: 900 });
    renderSection();

    await waitFor(() => screen.getByText('재개'));
    await act(async () => { fireEvent.click(screen.getByText('재개')); });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/sessions/sess-1'),
      expect.objectContaining({ method: 'PATCH', body: expect.stringContaining('"action":"resume"') }),
    );
    expect(useTimerStore.getState().status).toBe('RUNNING');
  });
});

describe('물주기 버튼 활성화 조건 (canWater)', () => {
  it('타이머 중지 상태 → 물주기 버튼 disabled', async () => {
    loginSession();
    setupDefaultFetch();
    useTimerStore.setState({ status: 'PAUSED', elapsedSec: 3600 });
    renderSection();

    await waitFor(() => screen.getByTestId('water-btn'));
    expect(screen.getByTestId('water-btn')).toBeDisabled();
  });

  it('30분 미달 → 물주기 버튼 disabled', async () => {
    loginSession();
    setupDefaultFetch();
    useTimerStore.setState({ status: 'RUNNING', elapsedSec: 1799 });
    renderSection();

    await waitFor(() => screen.getByTestId('water-btn'));
    expect(screen.getByTestId('water-btn')).toBeDisabled();
  });

  it('RUNNING + 30분 달성 → 물주기 버튼 활성화', async () => {
    loginSession();
    setupDefaultFetch();
    useTimerStore.setState({ status: 'RUNNING', elapsedSec: 1800 });
    renderSection();

    await waitFor(() => screen.getByTestId('water-btn'));
    expect(screen.getByTestId('water-btn')).not.toBeDisabled();
  });
});

describe('물주기 성공', () => {
  it('POST /api/water 호출 후 timerStore.elapsedSec 감소 + waterStore 갱신', async () => {
    loginSession();
    setupDefaultFetch();
    useTimerStore.setState({ status: 'RUNNING', elapsedSec: 3600, sessionId: 'sess-1' });
    renderSection();

    await waitFor(() => expect(screen.getByTestId('water-btn')).not.toBeDisabled());
    await act(async () => { fireEvent.click(screen.getByTestId('water-btn')); });

    expect(mockFetch).toHaveBeenCalledWith('/api/water', expect.objectContaining({ method: 'POST' }));
    expect(useTimerStore.getState().elapsedSec).toBe(1800);
    expect(useWaterStore.getState().waterCount).toBe(1);
    expect(useWaterStore.getState().creatureStage).toBe(1);
  });
});

describe('자동 정지 (autoPaused)', () => {
  it('autoPaused 상태: 재개 disabled + 물주기 enabled', async () => {
    loginSession();
    setupDefaultFetch();
    useTimerStore.setState({ status: 'PAUSED', elapsedSec: 1800, autoPaused: true });
    renderSection();

    await waitFor(() => screen.getByText('재개'));
    expect(screen.getByText('재개')).toBeDisabled();
    expect(screen.getByTestId('water-btn')).not.toBeDisabled();
  });

  it('autoPaused 시 POST /api/push/notify 호출', async () => {
    loginSession();
    setupDefaultFetch();
    useTimerStore.setState({ status: 'RUNNING', elapsedSec: 1799, sessionId: 'sess-1' });
    renderSection();

    await act(async () => {
      useTimerStore.getState().tick();
    });

    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/push/notify',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
  });

  it('물주기 후 autoPaused=false → 재개 버튼 활성화', async () => {
    loginSession();
    setupDefaultFetch();
    useTimerStore.setState({ status: 'PAUSED', elapsedSec: 1800, autoPaused: true, sessionId: 'sess-1' });
    renderSection();

    await waitFor(() => expect(screen.getByText('재개')).toBeDisabled());
    await act(async () => { fireEvent.click(screen.getByTestId('water-btn')); });

    await waitFor(() => expect(screen.getByText('재개')).not.toBeDisabled());
  });
});

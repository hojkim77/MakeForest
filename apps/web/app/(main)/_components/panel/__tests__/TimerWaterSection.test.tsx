import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TimerWaterSection } from '../TimerWaterSection';
import { useTimerStore, useTodoStore } from '@/shared/store';

// ── Mock: next-auth ──────────────────────────────────────────────────────────
jest.mock('next-auth/react', () => ({ useSession: jest.fn() }));
import { useSession } from 'next-auth/react';
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

// ── Mock: mapStore ───────────────────────────────────────────────────────────
let mockMapState = { focusedRegionCode: null as string | null, focusRegion: jest.fn() };
jest.mock('@/shared/store/mapStore', () => ({
  useMapStore: (sel: (s: typeof mockMapState) => unknown) => sel(mockMapState),
}));

// ── Mock: Icon ───────────────────────────────────────────────────────────────
jest.mock('@/shared/components/ui/Icon', () => ({
  Icon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

// ── Mock: useWaterQuery ──────────────────────────────────────────────────────
const mockWaterQuery = { waterCount: 0, creatureStage: 0, totalWaterCount: 0, growthPercent: 0 };
jest.mock('@/shared/hooks/queries/useWaterQuery', () => ({
  useWaterQuery: () => mockWaterQuery,
}));

// ── Mock: useWaterMutation ───────────────────────────────────────────────────
const mockWaterMutate = jest.fn();
jest.mock('@/shared/hooks/mutations/useWaterMutation', () => ({
  useWaterMutation: () => ({ mutateAsync: mockWaterMutate, isPending: false }),
}));

// ── Mock: useCreateSessionMutation ──────────────────────────────────────────
const mockCreateSession = jest.fn();
jest.mock('@/shared/hooks/mutations/useSessionMutation', () => ({
  useCreateSessionMutation: () => ({ mutateAsync: mockCreateSession }),
}));

// ── Mock: kstDateStore ───────────────────────────────────────────────────────
jest.mock('@/shared/store/kstDateStore', () => ({
  useKstDateStore: () => '2026-05-24',
}));

// ── Mock: fetch ──────────────────────────────────────────────────────────────
const mockFetch = jest.fn();
global.fetch = mockFetch;

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={makeQueryClient()}>{children}</QueryClientProvider>;
}

function loginSession(userId = 'user1') {
  mockUseSession.mockReturnValue({
    data: { user: { id: userId, name: '테스트', regionCode: '11' }, expires: '' },
    status: 'authenticated',
    update: jest.fn(),
  });
}

const defaultInitialWater = { waterCount: 0, creatureStage: 0, totalWaterCount: 0, growthPercent: 0 };

function renderSection(myRegionCode = '11', userId = 'user1') {
  return render(
    <TimerWaterSection myRegionCode={myRegionCode} userId={userId} initialWater={defaultInitialWater} initialSession={null} />,
    { wrapper },
  );
}

beforeEach(() => {
  mockMapState = { focusedRegionCode: null, focusRegion: jest.fn() };
  mockFetch.mockReset();
  mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
  mockWaterMutate.mockReset();
  mockCreateSession.mockReset();
  useTimerStore.setState({
    sessionId: null, startedAt: null, status: 'idle', cycleCount: 0,
  });
  useTodoStore.setState({ todos: [{ id: 'todo-1', text: '테스트 할 일', done: false }], savedTodos: [], open: false });
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
  it('createSession mutation 호출 → startSession 호출', async () => {
    loginSession();
    mockCreateSession.mockResolvedValue({ sessionId: 'sess-1', startedAt: new Date().toISOString(), isNewSession: false });
    renderSection();

    await waitFor(() => screen.getByTestId('timer-btn'));
    await act(async () => { fireEvent.click(screen.getByTestId('timer-btn')); });

    expect(mockCreateSession).toHaveBeenCalled();
    await waitFor(() => {
      expect(useTimerStore.getState().sessionId).toBe('sess-1');
      expect(useTimerStore.getState().status).toBe('running');
    });
  });
});

describe('물주기 성공', () => {
  it('waterMutate 호출 후 reset', async () => {
    loginSession();
    mockWaterMutate.mockResolvedValue({ myWaterCount: 1, userCreature: { stage: 1, totalWaterCount: 12 } });
    useTimerStore.setState({ status: 'complete', sessionId: 'sess-1', startedAt: Date.now() - 1800000 });
    renderSection();

    await waitFor(() => expect(screen.getByTestId('timer-btn')).toHaveTextContent('물주기'));
    await act(async () => { fireEvent.click(screen.getByTestId('timer-btn')); });

    expect(mockWaterMutate).toHaveBeenCalled();
    await waitFor(() => {
      expect(useTimerStore.getState().status).toBe('idle');
      expect(useTimerStore.getState().cycleCount).toBe(1);
    });
  });
});

describe('30분 완료 시 서버 PATCH + 푸시 알림', () => {
  it('status=complete 전환 시 PATCH /api/sessions/:id + POST /api/push/notify', async () => {
    loginSession();
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

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TimerWaterSection } from '../TimerWaterSection';
import type { TodayStateResType } from '@makeforest/types';

// ── Mock: next-auth ──────────────────────────────────────────────────────────
jest.mock('next-auth/react', () => ({ useSession: jest.fn() }));
import { useSession } from 'next-auth/react';
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

// ── Mock: Icon ───────────────────────────────────────────────────────────────
jest.mock('@/shared/components/ui/Icon', () => ({
  Icon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

// ── Mock: useWaterMutation ───────────────────────────────────────────────────
const mockWaterMutate = jest.fn();
jest.mock('@/shared/hooks/mutations/useWaterMutation', () => ({
  useWaterMutation: () => ({ mutateAsync: mockWaterMutate, isPending: false }),
}));

// ── Mock: useCreateSessionMutation ──────────────────────────────────────────
const mockCreateSession = jest.fn();
jest.mock('@/shared/hooks/mutations/useSessionMutation', () => ({
  useCreateSessionMutation: () => ({ mutateAsync: mockCreateSession, isPending: false }),
}));

// ── Mock: useTodaySessionQuery ───────────────────────────────────────────────
let mockTodayState: Partial<TodayStateResType> = {
  todayGoal: '테스트 목표',
  focusLengthMin: 30,
  segmentCount: 12,
  totalDailyCapMin: 360,
  sessionStatus: 'RUNNING',
  sessionId: 'sess-1',
  startedAt: new Date(Date.now() - 5000).toISOString(), // 5초 전 시작
  waterCount: 0,
};
jest.mock('@/shared/hooks/queries/useTodaySessionQuery', () => ({
  useTodaySessionQuery: () => ({ data: mockTodayState }),
}));

// ── Mock: kstDateStore ───────────────────────────────────────────────────────
jest.mock('@/shared/store/kstDateStore', () => ({
  useKstDateStore: () => '2026-05-24',
}));

// ── Mock: useMidnightReset ───────────────────────────────────────────────────
jest.mock('@/shared/hooks/useMidnightReset', () => ({
  useMidnightReset: () => {},
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

function renderSection(userId = 'user1') {
  return render(
    <TimerWaterSection userId={userId} initialTodayState={null} />,
    { wrapper },
  );
}

beforeEach(() => {
  mockFetch.mockReset();
  mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
  mockWaterMutate.mockReset();
  mockCreateSession.mockReset();
  mockTodayState = {
    todayGoal: '테스트 목표',
    focusLengthMin: 30,
    segmentCount: 12,
    totalDailyCapMin: 360,
    sessionStatus: 'RUNNING',
    sessionId: 'sess-1',
    startedAt: new Date(Date.now() - 5000).toISOString(),
    waterCount: 0,
  };
  jest.useFakeTimers({ doNotFake: ['Date'] });
});

afterEach(() => {
  jest.useRealTimers();
});

// ─────────────────────────────────────────────────────────────────────────────

describe('버튼 레이블 상태 전환', () => {
  it('RUNNING (집중 중) → 집중중 버튼 (disabled)', async () => {
    loginSession();
    mockTodayState = { ...mockTodayState, sessionStatus: 'RUNNING', startedAt: new Date(Date.now() - 5000).toISOString() };
    renderSection();
    await waitFor(() => expect(screen.getByTestId('timer-btn')).toBeDisabled());
  });

  it('RUNNING + elapsed >= cycleSec → 물주기 버튼 (enabled)', async () => {
    loginSession();
    mockTodayState = {
      ...mockTodayState,
      sessionStatus: 'RUNNING',
      startedAt: new Date(Date.now() - 31 * 60 * 1000).toISOString(),
    };
    renderSection();
    await waitFor(() => expect(screen.getByTestId('timer-btn')).toHaveTextContent('물주기'));
    expect(screen.getByTestId('timer-btn')).not.toBeDisabled();
  });

  it('IDLE → 재개 버튼 (enabled)', async () => {
    loginSession();
    mockTodayState = { ...mockTodayState, sessionStatus: 'IDLE', startedAt: null };
    renderSection();
    await waitFor(() => expect(screen.getByTestId('timer-btn')).toHaveTextContent('재개'));
    expect(screen.getByTestId('timer-btn')).not.toBeDisabled();
  });

  it('COMPLETED → 물주기 버튼 (enabled)', async () => {
    loginSession();
    mockTodayState = {
      ...mockTodayState,
      sessionStatus: 'COMPLETED',
      startedAt: new Date(Date.now() - 31 * 60 * 1000).toISOString(),
    };
    renderSection();
    await waitFor(() => expect(screen.getByTestId('timer-btn')).toHaveTextContent('물주기'));
  });
});

describe('재개 버튼 클릭', () => {
  it('createSession mutation 호출 시 todayState 값 사용', async () => {
    loginSession();
    mockTodayState = { ...mockTodayState, sessionStatus: 'IDLE', startedAt: null };
    mockCreateSession.mockResolvedValue({
      sessionId: 'sess-2',
      startedAt: new Date().toISOString(),
      isNewSession: false,
      focusLengthMin: 30,
      segmentCount: 12,
      todayGoal: '테스트 목표',
    });
    renderSection();

    await waitFor(() => screen.getByTestId('timer-btn'));
    await act(async () => { fireEvent.click(screen.getByTestId('timer-btn')); });

    expect(mockCreateSession).toHaveBeenCalledWith(
      expect.objectContaining({
        todayGoal: '테스트 목표',
        focusLengthMin: 30,
        segmentCount: 12,
      }),
    );
  });
});

describe('물주기 성공', () => {
  it('waterMutate 호출', async () => {
    loginSession();
    mockTodayState = {
      ...mockTodayState,
      sessionStatus: 'RUNNING',
      startedAt: new Date(Date.now() - 31 * 60 * 1000).toISOString(),
    };
    mockWaterMutate.mockResolvedValue({
      myWaterCount: 1,
      segmentCount: 12,
      focusLengthMin: 30,
      userCreature: { stage: 1, totalWaterCount: 12, totalFocusMinutes: 360, minutesUntilNextStage: 720 },
    });
    renderSection();

    await waitFor(() => expect(screen.getByTestId('timer-btn')).toHaveTextContent('물주기'));
    await act(async () => { fireEvent.click(screen.getByTestId('timer-btn')); });

    expect(mockWaterMutate).toHaveBeenCalled();
  });
});

describe('사이클 완료 시 서버 PATCH + 푸시 알림', () => {
  it('RUNNING + elapsed >= cycleSec 시 PATCH /api/sessions/:id + POST /api/push/notify', async () => {
    loginSession();
    mockTodayState = {
      ...mockTodayState,
      sessionStatus: 'RUNNING',
      startedAt: new Date(Date.now() - 31 * 60 * 1000).toISOString(),
    };
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
  it('focusLengthMin(30분) 이상 경과 후 복귀 시 물주기 버튼 표시', async () => {
    loginSession();
    mockTodayState = {
      ...mockTodayState,
      sessionStatus: 'RUNNING',
      startedAt: new Date(Date.now() - 31 * 60 * 1000).toISOString(),
    };
    renderSection();

    await act(async () => {
      Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await waitFor(() => expect(screen.getByTestId('timer-btn')).toHaveTextContent('물주기'));
  });
});

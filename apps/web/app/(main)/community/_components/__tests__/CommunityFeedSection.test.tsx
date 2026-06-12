import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CommunityFeedSection } from '../CommunityFeedSection';
import type { CommunityFeedResponse } from '@makeforest/types';

// ── Mock: next-auth ──────────────────────────────────────────────────────────
jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: null, status: 'unauthenticated' }),
}));

// ── Mock: child components ───────────────────────────────────────────────────
jest.mock('../PostCard', () => ({
  PostCard: ({ post }: { post: { id: string; goal: string | null } }) =>
    React.createElement('article', { 'data-testid': `post-${post.id}` }, post.goal ?? post.id),
}));

jest.mock('../RegionAccordion', () => ({
  RegionAccordion: () => React.createElement('div', { 'data-testid': 'region-accordion' }),
}));

jest.mock('@/app/(main)/_components/panel/TabButton', () => ({
  TabButton: ({ label, onClick }: { label: string; onClick: () => void }) =>
    React.createElement('button', { onClick }, label),
}));

// ── Mock: useMyReactionsQuery ────────────────────────────────────────────────
jest.mock('@/shared/hooks/queries/useMyReactionsQuery', () => ({
  useMyReactionsQuery: () => ({ data: {} }),
}));

// ── Mock: useCommunityFeedQuery ──────────────────────────────────────────────
const mockFetchNextPage = jest.fn();
let mockHasNextPage = true;
let mockIsFetchingNextPage = false;
let mockItems: CommunityFeedResponse['items'] = [];

jest.mock('@/shared/hooks/queries/useCommunityFeedQuery', () => ({
  useCommunityFeedQuery: (_filters: unknown, initialData?: CommunityFeedResponse) => ({
    data: { items: initialData?.items ?? mockItems, nextCursor: null },
    isPending: false,
    isFetchingNextPage: mockIsFetchingNextPage,
    hasNextPage: mockHasNextPage,
    fetchNextPage: mockFetchNextPage,
  }),
}));

// ── IntersectionObserver mock ────────────────────────────────────────────────
type IntersectionCallback = (entries: IntersectionObserverEntry[]) => void;

let observerCallback: IntersectionCallback | null = null;
const mockObserve = jest.fn();
const mockDisconnect = jest.fn();

class MockIntersectionObserver {
  constructor(cb: IntersectionCallback) {
    observerCallback = cb;
  }
  observe = mockObserve;
  disconnect = mockDisconnect;
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
});

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: makeQueryClient() }, children);
}

const emptyFeed: CommunityFeedResponse = { items: [], nextCursor: null };

const feedWithPosts: CommunityFeedResponse = {
  items: [
    {
      id: 'post-1',
      goal: '테스트 포스트',
      createdAt: new Date().toISOString(),
      dongName: '강남구',
      user: { nickname: '사용자', dongCode: '1168010100' },
      session: null,
      creature: { stage: 1 },
      reactions: [],
      commentCount: 0,
    },
  ],
  nextCursor: 'cursor-1',
};

beforeEach(() => {
  mockFetchNextPage.mockReset();
  mockObserve.mockReset();
  mockDisconnect.mockReset();
  observerCallback = null;
  mockHasNextPage = true;
  mockIsFetchingNextPage = false;
  mockItems = [];
});

// ─────────────────────────────────────────────────────────────────────────────

describe('CommunityFeedSection — SSR initialData hydration', () => {
  it('initialFeed 포스트가 즉시 렌더링된다', () => {
    render(<CommunityFeedSection initialFeed={feedWithPosts} />, { wrapper });
    expect(screen.getByTestId('post-post-1')).toBeInTheDocument();
  });

  it('initialFeed가 비어있어도 렌더링에 문제없다', () => {
    render(<CommunityFeedSection initialFeed={emptyFeed} />, { wrapper });
    expect(screen.getByText(/집중 기록이 없어요/)).toBeInTheDocument();
  });
});

describe('CommunityFeedSection — IntersectionObserver 자동 로드', () => {
  it('sentinel이 뷰포트에 진입하면 fetchNextPage가 호출된다', async () => {
    render(<CommunityFeedSection initialFeed={feedWithPosts} />, { wrapper });

    expect(mockObserve).toHaveBeenCalled();

    await act(async () => {
      observerCallback?.([{ isIntersecting: true } as IntersectionObserverEntry]);
    });

    expect(mockFetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('hasNextPage가 false이면 fetchNextPage를 호출하지 않는다', async () => {
    mockHasNextPage = false;
    render(<CommunityFeedSection initialFeed={feedWithPosts} />, { wrapper });

    await act(async () => {
      observerCallback?.([{ isIntersecting: true } as IntersectionObserverEntry]);
    });

    expect(mockFetchNextPage).not.toHaveBeenCalled();
  });

  it('isFetchingNextPage 중에는 중복 호출되지 않는다', async () => {
    mockIsFetchingNextPage = true;
    render(<CommunityFeedSection initialFeed={feedWithPosts} />, { wrapper });

    await act(async () => {
      observerCallback?.([{ isIntersecting: true } as IntersectionObserverEntry]);
    });

    expect(mockFetchNextPage).not.toHaveBeenCalled();
  });
});

describe('CommunityFeedSection — 필터 변경 시 스켈레톤', () => {
  it('초기 진입 시 스켈레톤이 보이지 않는다', () => {
    render(<CommunityFeedSection initialFeed={feedWithPosts} />, { wrapper });
    expect(screen.queryByTestId('feed-skeleton')).not.toBeInTheDocument();
  });
});

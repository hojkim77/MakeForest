import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DailyCollectionCard } from '../DailyCollectionCard';

// ── Mock: kstDateStore ───────────────────────────────────────────────────────
jest.mock('@/shared/store/kstDateStore', () => ({
  useKstDateStore: () => '2026-05-24',
}));

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={makeQueryClient()}>{children}</QueryClientProvider>;
}

function makeCollection(overrides = {}) {
  return {
    creatureType: 'MUSHROOM',
    targetCount: 50,
    currentCount: 38,
    isCompleted: false,
    ...overrides,
  };
}

describe('DailyCollectionCard — 렌더링', () => {
  it('생명체 타입과 진행 상황을 표시한다', () => {
    render(
      <DailyCollectionCard
        dongCode="1111010100"
        regionCode="11"
        initialCollection={makeCollection()}
      />,
      { wrapper },
    );
    expect(screen.getByText('MUSHROOM')).toBeInTheDocument();
    expect(screen.getByTestId('collection-progress')).toHaveTextContent('38 / 50');
  });

  it('dongCode 없으면 렌더링하지 않는다', () => {
    const { container } = render(
      <DailyCollectionCard dongCode={null} regionCode={null} initialCollection={null} />,
      { wrapper },
    );
    expect(container.firstChild).toBeNull();
  });

  it('달성 완료 시 완료 메시지를 표시한다', () => {
    render(
      <DailyCollectionCard
        dongCode="1111010100"
        regionCode="11"
        initialCollection={makeCollection({ isCompleted: true, currentCount: 50 })}
      />,
      { wrapper },
    );
    expect(screen.getByText(/채집 완료/)).toBeInTheDocument();
  });
});


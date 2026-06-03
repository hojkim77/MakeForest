import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { DailyCollectionCard } from '../DailyCollectionCard';
import { makeQueryClient } from '@/test/renderWithProviders';
import { makeCollection } from '@/test/factories/collection';

// ── Mock: kstDateStore ───────────────────────────────────────────────────────
jest.mock('@/shared/store/kstDateStore', () => ({
  useKstDateStore: () => '2026-05-24',
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(
    QueryClientProvider,
    { client: makeQueryClient() },
    children,
  );
}

describe('DailyCollectionCard — 렌더링', () => {
  it('생명체 타입과 진행 상황을 표시한다', () => {
    render(
      <DailyCollectionCard
        dongCode="1111010100"
        regionCode="11"
        initialCollection={makeCollection({ currentCount: 38, targetCount: 50 })}
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
        initialCollection={makeCollection({ isCompleted: true, currentCount: 50, targetCount: 50 })}
      />,
      { wrapper },
    );
    expect(screen.getByText(/채집 완료/)).toBeInTheDocument();
  });
});

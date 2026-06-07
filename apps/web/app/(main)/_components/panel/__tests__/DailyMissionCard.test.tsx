import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { DailyMissionCard } from '../DailyMissionCard';
import { makeQueryClient } from '@/test/renderWithProviders';
import { makeMission } from '@/test/factories/mission';

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

describe('DailyMissionCard — 렌더링', () => {
  it('참여자 수와 목표를 표시한다', () => {
    render(
      <DailyMissionCard
        dongCode="1111010100"
        regionCode="11"
        initialMission={makeMission({ currentCount: 38, targetCount: 50 })}
      />,
      { wrapper },
    );
    expect(screen.getByTestId('mission-progress')).toHaveTextContent('38명 참여 중 / 목표 50명');
  });

  it('dongCode 없으면 렌더링하지 않는다', () => {
    const { container } = render(
      <DailyMissionCard dongCode={null} regionCode={null} initialMission={null} />,
      { wrapper },
    );
    expect(container.firstChild).toBeNull();
  });

  it('달성 완료 시 완료 메시지를 표시한다', () => {
    render(
      <DailyMissionCard
        dongCode="1111010100"
        regionCode="11"
        initialMission={makeMission({ isCompleted: true, currentCount: 50, targetCount: 50 })}
      />,
      { wrapper },
    );
    expect(screen.getByText(/미션 달성/)).toBeInTheDocument();
  });
});

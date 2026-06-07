import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { MissionTab } from '../MissionTab';
import { RankingTab } from '../RankingTab';
import { usePanelStore } from '@/shared/store';
import { MockEventSource, installMockEventSource } from '@/test/MockEventSource';
import { makeQueryClient } from '@/test/renderWithProviders';

installMockEventSource();

const defaultRanking = { period: 'today' as const, rankings: [], myRegionKey: null };

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

function makeMission(overrides = {}) {
  return {
    creatureType: 'MUSHROOM',
    targetCount: 50,
    currentCount: 20,
    isCompleted: false,
    ...overrides,
  };
}

beforeEach(() => {
  MockEventSource.reset();
  usePanelStore.setState({ activeTab: null });
});

describe('PanelSideTabs — 탭 버튼 렌더링', () => {
  it('공통 미션과 지역 랭킹 탭 버튼이 렌더링된다', () => {
    render(
      <>
        <MissionTab dongCode={null} regionCode={null} initialMission={null} />
        <RankingTab myRegionKey={null} initialRanking={defaultRanking} />
      </>,
      { wrapper },
    );
    expect(screen.getByRole('button', { name: /공통 미션/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /지역 랭킹/i })).toBeInTheDocument();
  });
});

describe('PanelSideTabs — 드로어 토글', () => {
  it('공통 미션 탭 클릭 시 활성화된다', () => {
    render(
      <MissionTab
        dongCode="1111010100"
        regionCode="11"
        initialMission={makeMission()}
      />,
      { wrapper },
    );
    fireEvent.click(screen.getByRole('button', { name: /공통 미션/i }));
    expect(usePanelStore.getState().activeTab).toBe('mission');
  });

  it('탭 재클릭 시 닫힌다', () => {
    usePanelStore.setState({ activeTab: 'mission' });
    render(
      <MissionTab
        dongCode="1111010100"
        regionCode="11"
        initialMission={makeMission()}
      />,
      { wrapper },
    );
    fireEvent.click(screen.getByRole('button', { name: /공통 미션/i }));
    expect(usePanelStore.getState().activeTab).toBeNull();
  });
});

describe('PanelSideTabs — 드로어 내용', () => {
  it('공통 미션 탭 열림 시 미션 내용이 표시된다', () => {
    usePanelStore.setState({ activeTab: 'mission' });
    render(
      <MissionTab
        dongCode="1111010100"
        regionCode="11"
        initialMission={makeMission()}
      />,
      { wrapper },
    );
    expect(screen.getByText(/오늘의 공통 미션/)).toBeInTheDocument();
  });

  it('탭 닫힘 시 내용이 숨겨진다', () => {
    usePanelStore.setState({ activeTab: null });
    render(
      <MissionTab
        dongCode="1111010100"
        regionCode="11"
        initialMission={makeMission()}
      />,
      { wrapper },
    );
    expect(screen.queryByText(/오늘의 공통 미션/)).not.toBeVisible();
  });
});

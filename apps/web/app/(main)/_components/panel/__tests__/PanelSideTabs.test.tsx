import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CollectionTab } from '../CollectionTab';
import { RankingTab } from '../RankingTab';
import { usePanelStore } from '@/shared/store';

// ── MockEventSource ────────────────────────────────────────────────────────────
class MockEventSource {
  static lastInstance: MockEventSource | null = null;
  url: string;
  listeners: Record<string, (e: MessageEvent) => void> = {};
  close = jest.fn();

  constructor(url: string) {
    this.url = url;
    MockEventSource.lastInstance = this;
  }

  addEventListener(type: string, cb: (e: MessageEvent) => void) {
    this.listeners[type] = cb;
  }

  triggerEvent(type: string, data: object) {
    this.listeners[type]?.({ data: JSON.stringify(data) } as MessageEvent);
  }
}
(global as unknown as Record<string, unknown>).EventSource = MockEventSource;

const defaultRanking = { period: 'today' as const, rankings: [], myRegionKey: null };

function makeCollection(overrides = {}) {
  return {
    creatureType: 'MUSHROOM',
    targetCount: 50,
    currentCount: 20,
    isCompleted: false,
    topContributors: [],
    ...overrides,
  };
}

beforeEach(() => {
  MockEventSource.lastInstance = null;
  usePanelStore.setState({ activeTab: null });
});

describe('PanelSideTabs — 탭 버튼 렌더링', () => {
  it('공통 미션과 지역 랭킹 탭 버튼이 렌더링된다', () => {
    render(
      <>
        <CollectionTab dongCode={null} regionCode={null} initialCollection={null} />
        <RankingTab myRegionKey={null} initialRanking={defaultRanking} />
      </>,
    );
    expect(screen.getByRole('button', { name: /공통 미션/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /지역 랭킹/i })).toBeInTheDocument();
  });
});

describe('PanelSideTabs — 드로어 토글', () => {
  it('공통 미션 탭 클릭 시 활성화된다', () => {
    render(
      <CollectionTab
        dongCode="1111010100"
        regionCode="11"
        initialCollection={makeCollection()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /공통 미션/i }));
    expect(usePanelStore.getState().activeTab).toBe('collection');
  });

  it('탭 재클릭 시 닫힌다', () => {
    usePanelStore.setState({ activeTab: 'collection' });
    render(
      <CollectionTab
        dongCode="1111010100"
        regionCode="11"
        initialCollection={makeCollection()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /공통 미션/i }));
    expect(usePanelStore.getState().activeTab).toBeNull();
  });
});

describe('PanelSideTabs — 드로어 내용', () => {
  it('공통 미션 탭 열림 시 미션 내용이 표시된다', () => {
    usePanelStore.setState({ activeTab: 'collection' });
    render(
      <CollectionTab
        dongCode="1111010100"
        regionCode="11"
        initialCollection={makeCollection()}
      />,
    );
    expect(screen.getByText('MUSHROOM')).toBeInTheDocument();
  });

  it('탭 닫힘 시 내용이 숨겨진다', () => {
    usePanelStore.setState({ activeTab: null });
    render(
      <CollectionTab
        dongCode="1111010100"
        regionCode="11"
        initialCollection={makeCollection()}
      />,
    );
    expect(screen.queryByText('MUSHROOM')).not.toBeVisible();
  });
});

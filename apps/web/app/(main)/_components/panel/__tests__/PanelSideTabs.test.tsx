import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PanelSideTabs } from '../PanelSideTabs';
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
  usePanelStore.setState({ collectionDrawerOpen: false });
});

describe('PanelSideTabs — 탭 버튼 렌더링', () => {
  it('공통 미션 탭 버튼이 렌더링된다', () => {
    render(
      <PanelSideTabs dongCode={null} regionCode={null} initialCollection={null} />,
    );
    expect(screen.getByRole('button', { name: /공통 미션/i })).toBeInTheDocument();
  });
});

describe('PanelSideTabs — 드로어 토글', () => {
  it('공통 미션 탭 클릭 시 드로어가 열린다', () => {
    render(
      <PanelSideTabs
        dongCode="1111010100"
        regionCode="11"
        initialCollection={makeCollection()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /공통 미션/i }));
    expect(usePanelStore.getState().collectionDrawerOpen).toBe(true);
  });

  it('탭 재클릭 시 드로어가 닫힌다', () => {
    usePanelStore.setState({ collectionDrawerOpen: true });
    render(
      <PanelSideTabs
        dongCode="1111010100"
        regionCode="11"
        initialCollection={makeCollection()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /공통 미션/i }));
    expect(usePanelStore.getState().collectionDrawerOpen).toBe(false);
  });
});

describe('PanelSideTabs — 드로어 내용', () => {
  it('드로어 열림 시 공통 미션 내용이 표시된다', () => {
    usePanelStore.setState({ collectionDrawerOpen: true });
    render(
      <PanelSideTabs
        dongCode="1111010100"
        regionCode="11"
        initialCollection={makeCollection()}
      />,
    );
    expect(screen.getByText('MUSHROOM')).toBeInTheDocument();
  });

  it('드로어 닫힘 시 내용이 숨겨진다', () => {
    usePanelStore.setState({ collectionDrawerOpen: false });
    render(
      <PanelSideTabs
        dongCode="1111010100"
        regionCode="11"
        initialCollection={makeCollection()}
      />,
    );
    expect(screen.queryByText('MUSHROOM')).not.toBeInTheDocument();
  });
});

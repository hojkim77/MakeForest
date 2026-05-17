import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { DailyCollectionCard } from '../DailyCollectionCard';

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
    currentCount: 38,
    isCompleted: false,
    ...overrides,
  };
}

beforeEach(() => {
  MockEventSource.lastInstance = null;
});

describe('DailyCollectionCard — 렌더링', () => {
  it('생명체 타입과 진행 상황을 표시한다', () => {
    render(
      <DailyCollectionCard
        dongCode="1111010100"
        regionCode="11"
        initialCollection={makeCollection()}
      />,
    );
    expect(screen.getByText('MUSHROOM')).toBeInTheDocument();
    expect(screen.getByTestId('collection-progress')).toHaveTextContent('38 / 50');
  });

  it('dongCode 없으면 렌더링하지 않는다', () => {
    const { container } = render(
      <DailyCollectionCard dongCode={null} regionCode={null} initialCollection={null} />,
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
    );
    expect(screen.getByText(/채집 완료/)).toBeInTheDocument();
  });
});

describe('DailyCollectionCard — SSE water:toast 실시간 갱신', () => {
  it('water:toast 이벤트 수신 시 currentCount 업데이트', () => {
    render(
      <DailyCollectionCard
        dongCode="1111010100"
        regionCode="11"
        initialCollection={makeCollection({ currentCount: 38 })}
      />,
    );

    act(() => {
      MockEventSource.lastInstance!.triggerEvent('session:toast', {
        dongCode: '1111010100',
        nickname: '김OO',
        collectionProgress: { creatureType: 'MUSHROOM', currentCount: 39, targetCount: 50, isCompleted: false },
      });
    });

    expect(screen.getByTestId('collection-progress')).toHaveTextContent('39 / 50');
  });

  it('SSE 연결 해제 시 EventSource.close() 호출', () => {
    const { unmount } = render(
      <DailyCollectionCard
        dongCode="1111010100"
        regionCode="11"
        initialCollection={makeCollection()}
      />,
    );
    const instance = MockEventSource.lastInstance!;
    unmount();
    expect(instance.close).toHaveBeenCalled();
  });
});

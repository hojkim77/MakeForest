'use client';

import { useMapStore } from '@/shared/store';
import { SseToastFeed, type SseEventConfig } from '@/shared/components/ui/SseToastFeed';

const SERVER_URL =
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:4000')
    : 'http://localhost:4000';

const EVENTS: SseEventConfig[] = [
  {
    type: 'water:toast',
    render: (raw) => {
      const { nickname } = JSON.parse(raw) as { nickname: string };
      return (
        <>
          <span className="text-primary">💧</span>
          <span>{nickname}님이 물을 줬어요!</span>
        </>
      );
    },
  },
  {
    type: 'session:toast',
    render: (raw) => {
      const { nickname } = JSON.parse(raw) as { nickname: string };
      return (
        <>
          <span className="text-primary">🌿</span>
          <span>{nickname}님이 오늘의 미션에 참여했어요!</span>
        </>
      );
    },
  },
];

export function ActivityToastFeed({ myRegionCode }: { myRegionCode: string | null }) {
  const focusedRegionCode = useMapStore((s) => s.focusedRegionCode);
  const regionCode = focusedRegionCode ?? myRegionCode;
  const url = regionCode
    ? `${SERVER_URL}/sse/activity-stream/regionCode/${encodeURIComponent(regionCode)}`
    : null;

  return (
    <SseToastFeed
      url={url}
      events={EVENTS}
      className="fixed left-2 top-[180px] w-[400px] z-40 pointer-events-none"
    />
  );
}

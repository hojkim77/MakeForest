'use client';

import { useEffect, useRef, useState } from 'react';
import { useMapStore } from '@/shared/store';
import { ToastShell } from '@/shared/components/ui/ToastContainer';

interface ToastMessage {
  id: number;
  nickname: string;
}

const SERVER_URL =
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:4000')
    : 'http://localhost:4000';

export function NeighborhoodWaterFeed({ myRegionCode }: { myRegionCode: string | null }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const counterRef = useRef(0);
  const focusedRegionCode = useMapStore((s) => s.focusedRegionCode);
  const regionCode = focusedRegionCode ?? myRegionCode;

  useEffect(() => {
    if (!regionCode) return;

    const es = new EventSource(`${SERVER_URL}/sse/activity-stream/regionCode/${encodeURIComponent(regionCode)}`);

    es.addEventListener('water:toast', (e) => {
      const data = JSON.parse((e as MessageEvent).data) as { nickname: string };
      const id = ++counterRef.current;
      setToasts((prev) => [...prev, { id, nickname: data.nickname }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3000);
    });

    return () => es.close();
  }, [regionCode]);

  if (toasts.length === 0) return null;

  return (
    <div className="flex flex-col gap-xs pointer-events-none">
      {toasts.map((t) => (
        <ToastShell
          key={t.id}
          className="gap-xs py-xs border border-primary bg-primary-container text-on-primary-container animate-fade-in-up"
        >
          <span className="text-primary">💧</span>
          <span>{t.nickname}님이 물을 줬어요!</span>
        </ToastShell>
      ))}
    </div>
  );
}

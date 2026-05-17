'use client';

import { useEffect, useRef, useState } from 'react';
import { ToastShell } from './ToastContainer';

export interface SseEventConfig {
  type: string;
  render: (rawData: string) => React.ReactNode;
}

interface Toast {
  id: number;
  content: React.ReactNode;
  exiting: boolean;
}

const DISPLAY_MS = 2700;
const REMOVE_MS = 3000;

interface Props {
  url: string | null;
  events: SseEventConfig[];
  className?: string;
}

export function SseToastFeed({ url, events, className = '' }: Props) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  useEffect(() => {
    if (!url || events.length === 0) return;

    const es = new EventSource(url);

    for (const config of events) {
      es.addEventListener(config.type, (e) => {
        const id = ++counterRef.current;
        const content = config.render((e as MessageEvent<string>).data);
        setToasts((prev) => [...prev, { id, content, exiting: false }]);
        setTimeout(() => {
          setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
        }, DISPLAY_MS);
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, REMOVE_MS);
      });
    }

    return () => es.close();
  }, [url, events]);

  if (toasts.length === 0) return null;

  return (
    <div className={`flex flex-col gap-xs ${className}`}>
      {toasts.map((t) => (
        <ToastShell
          key={t.id}
          className={`gap-xs py-xs border border-primary bg-primary-container text-on-primary-container ${t.exiting ? 'animate-fade-out' : 'animate-fade-in-up'}`}
        >
          {t.content}
        </ToastShell>
      ))}
    </div>
  );
}

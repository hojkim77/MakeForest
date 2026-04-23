'use client';

import { useEffect, useState } from 'react';
import { Icon } from './Icon';

export interface WaterToastData {
  id: string;
  message: string;
}

interface WaterToastProps {
  toasts: WaterToastData[];
  onDismiss: (id: string) => void;
}

/** Single auto-dismissing toast item */
function ToastItem({ toast, onDismiss }: { toast: WaterToastData; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 3500);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);

  return (
    <div className="bg-inverse-surface text-inverse-on-surface px-md py-sm border border-outline flex items-center gap-sm animate-pulse">
      <Icon name="water_drop" filled className="text-primary-fixed" size={20} />
      <span className="font-mono text-label">{toast.message}</span>
    </div>
  );
}

/**
 * Fixed toast container for real-time water-drop notifications.
 * Place once in the root layout area; feed it via SSE/WebSocket events.
 */
export function WaterToast({ toasts, onDismiss }: WaterToastProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] flex flex-col items-center gap-xs pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}

/**
 * Self-contained toast manager hook.
 * Usage: const { toasts, addToast, dismissToast } = useWaterToasts();
 */
export function useWaterToasts() {
  const [toasts, setToasts] = useState<WaterToastData[]>([]);

  const addToast = (message: string) =>
    setToasts((prev) => [...prev, { id: crypto.randomUUID(), message }]);

  const dismissToast = (id: string) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  return { toasts, addToast, dismissToast };
}

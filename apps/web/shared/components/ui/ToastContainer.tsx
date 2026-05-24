'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useToastStore, type Toast } from '@/shared/store/toastStore';
import { Icon } from './Icon';

const TYPE_STYLES: Record<Toast['type'], { container: string; icon: string; iconName: string }> = {
  error: {
    container: 'bg-error-container text-on-error-container',
    icon: 'text-on-error-container',
    iconName: 'error',
  },
  success: {
    container: 'bg-primary-container text-on-primary-container',
    icon: 'text-on-primary-container',
    iconName: 'check_circle',
  },
  info: {
    container: 'bg-inverse-surface text-inverse-on-surface',
    icon: 'text-inverse-on-surface',
    iconName: 'info',
  },
};

export function ToastShell({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`flex items-center px-md font-mono text-label ${className}`}>
      {children}
    </div>
  );
}

function ToastItem({ toast }: { toast: Toast }) {
  const removeToast = useToastStore((s) => s.removeToast);
  const styles = TYPE_STYLES[toast.type];

  useEffect(() => {
    const t = setTimeout(() => removeToast(toast.id), toast.duration);
    return () => clearTimeout(t);
  }, [toast.id, toast.duration, removeToast]);

  return (
    <ToastShell className={`gap-sm py-sm border border-outline ${styles.container}`}>
      <Icon name={styles.iconName} filled size={18} className={styles.icon} />
      <span className="flex-1">{toast.message}</span>
      {toast.action && (
        <Link
          href={toast.action.href}
          onClick={() => removeToast(toast.id)}
          className="font-mono text-label underline underline-offset-2 opacity-80 hover:opacity-100"
        >
          {toast.action.label}
        </Link>
      )}
      <button onClick={() => removeToast(toast.id)} className="opacity-60 hover:opacity-100">
        <Icon name="close" size={16} className={styles.icon} />
      </button>
    </ToastShell>
  );
}

export function ToastContainer({
  className = 'fixed top-4 right-4 z-[70] pointer-events-none',
}: {
  className?: string;
}) {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className={`flex flex-col gap-xs ${className}`}>
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} />
        </div>
      ))}
    </div>
  );
}

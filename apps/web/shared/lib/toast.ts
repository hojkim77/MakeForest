import { useToastStore } from '@/shared/store/toastStore';

type Action = { label: string; href: string };

function add(type: 'error' | 'success' | 'info', message: string, action: Action | undefined, duration: number) {
  useToastStore.getState().addToast(
    action
      ? { type, message, duration, action }
      : { type, message, duration },
  );
}

export const toast = {
  error: (message: string, action?: Action, duration = 4000) => add('error', message, action, duration),
  success: (message: string, action?: Action, duration = 3000) => add('success', message, action, duration),
  info: (message: string, action?: Action, duration = 3000) => add('info', message, action, duration),
};

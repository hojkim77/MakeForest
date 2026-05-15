import { useToastStore } from '@/shared/store/toastStore';

export const toast = {
  error: (message: string, duration = 4000) =>
    useToastStore.getState().addToast({ type: 'error', message, duration }),

  success: (message: string, duration = 3000) =>
    useToastStore.getState().addToast({ type: 'success', message, duration }),

  info: (message: string, duration = 3000) =>
    useToastStore.getState().addToast({ type: 'info', message, duration }),
};

import { signOut } from 'next-auth/react';
import { ApiError } from './api';
import { toast } from './toast';

interface ErrorMessages {
  conflict?: string;  // 409
  notFound?: string;  // 404
  fallback?: string;
}

export function handleApiError(err: unknown, messages?: ErrorMessages): void {
  if (err instanceof DOMException && err.name === 'AbortError') return;

  if (err instanceof ApiError) {
    if (err.status === 401) {
      signOut({ callbackUrl: '/login' });
      return;
    }
    if (err.status === 409) {
      toast.info(messages?.conflict ?? '이미 처리된 요청이에요.');
      return;
    }
    if (err.status === 404) {
      toast.error(messages?.notFound ?? '요청한 데이터를 찾을 수 없어요.');
      return;
    }
  }
  toast.error(messages?.fallback ?? '오류가 발생했어요. 잠시 후 다시 시도해주세요.');
}

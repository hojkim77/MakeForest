import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api';

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: (failureCount, err) =>
          err instanceof ApiError && err.status >= 500 ? failureCount < 2 : false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        refetchOnMount: true,
      },
    },
  });
}

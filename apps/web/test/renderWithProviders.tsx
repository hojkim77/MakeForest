import React from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function makeQueryClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

interface ProvidersProps {
  children: React.ReactNode;
  queryClient?: QueryClient;
}

export function TestProviders({ children, queryClient }: ProvidersProps) {
  const client = queryClient ?? makeQueryClient();
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

type RenderWithProvidersOptions = RenderOptions & { queryClient?: QueryClient };

export function renderWithProviders(
  ui: React.ReactElement,
  options: RenderWithProvidersOptions = {},
) {
  const { queryClient, ...renderOptions } = options;
  const client = queryClient ?? makeQueryClient();
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
    renderOptions,
  );
}

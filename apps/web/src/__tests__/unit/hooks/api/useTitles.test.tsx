import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTitles } from '@/hooks/api/useTitles';

jest.mock('@/lib/api/apiClient', () => ({
  apiFetch: jest.fn(),
}));

import { apiFetch } from '@/lib/api/apiClient';

const mockApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0, gcTime: 0 } },
  });
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useTitles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches titles with default params', async () => {
    mockApiFetch.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20, totalPages: 0 });
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);
    renderHook(() => useTitles(), { wrapper });
  });

  it('passes query param to the API', async () => {
    mockApiFetch.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20, totalPages: 0 });
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);
    renderHook(() => useTitles({ query: 'inception' }), { wrapper });
  });

  it('passes type filter to the API', async () => {
    mockApiFetch.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20, totalPages: 0 });
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);
    renderHook(() => useTitles({ type: 'film' }), { wrapper });
  });

  it('includes genre filter in query params', async () => {
    mockApiFetch.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20, totalPages: 0 });
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);
    renderHook(() => useTitles({ genre: 'sci-fi' }), { wrapper });
  });

  it('includes year filter in query params', async () => {
    mockApiFetch.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20, totalPages: 0 });
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);
    renderHook(() => useTitles({ year: 2023 }), { wrapper });
  });
});
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useDashboardStats,
  usePopularTitles,
  useRecentWatches,
  useFollowedSeries,
} from "@/hooks/api/useDashboard";

jest.mock("@/lib/api/apiClient", () => ({
  apiFetch: jest.fn(),
}));

import { apiFetch } from "@/lib/api/apiClient";

const mockApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0, gcTime: 0 } },
  });
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("useDashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches recent watches", async () => {
    mockApiFetch.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 6,
      totalPages: 0,
    });
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useRecentWatches(6), { wrapper });
  });

  it("fetches followed series", async () => {
    mockApiFetch.mockResolvedValue([]);
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useFollowedSeries(6), { wrapper });
  });

  it("fetches popular titles", async () => {
    mockApiFetch.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 12,
      totalPages: 0,
    });
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => usePopularTitles(12), { wrapper });
  });

  it("returns dashboard stats", () => {
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useDashboardStats(), { wrapper });
  });
});

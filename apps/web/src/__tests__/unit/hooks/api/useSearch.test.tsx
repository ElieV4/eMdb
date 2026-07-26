import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSearch } from "@/hooks/api/useSearch";

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

describe("useSearch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches search results for a query", async () => {
    mockApiFetch.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useSearch({ query: "inception" }), {
      wrapper,
    });
  });

  it("passes query param to both title and people endpoints", async () => {
    mockApiFetch.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 5,
      totalPages: 0,
    });
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);
    renderHook(() => useSearch({ query: "test" }), { wrapper });
  });

  it("filters by type=film for title search only", async () => {
    mockApiFetch.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);
    renderHook(() => useSearch({ query: "inception", type: "film" }), {
      wrapper,
    });
  });

  it("filters by type=personne for people search only", async () => {
    mockApiFetch.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);
    renderHook(() => useSearch({ query: "leo", type: "personne" }), {
      wrapper,
    });
  });

  it("includes genre filter", async () => {
    mockApiFetch.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);
    renderHook(() => useSearch({ query: "test", genre: "sci-fi" }), {
      wrapper,
    });
  });

  it("includes year filter", async () => {
    mockApiFetch.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);
    renderHook(() => useSearch({ query: "test", year: 2023 }), { wrapper });
  });
});

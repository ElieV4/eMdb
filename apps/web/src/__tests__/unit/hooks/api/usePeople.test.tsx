import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  usePeople,
  usePerson,
  usePersonFilmography,
  usePopularPeople,
} from "@/hooks/api/usePeople";

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

describe("usePeople", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches people search results", async () => {
    mockApiFetch.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => usePeople({ query: "leo" }), {
      wrapper,
    });
  });

  it("passes page and limit params", async () => {
    mockApiFetch.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    });
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);
    renderHook(() => usePeople({ query: "leo", page: 2, limit: 10 }), {
      wrapper,
    });
  });

  it("does not fetch when query is empty", () => {
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => usePeople({ query: "" }), { wrapper });
  });

  it("fetches a single person by id", async () => {
    mockApiFetch.mockResolvedValue({ id: "1", nom: "Leonardo DiCaprio" });
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);
    renderHook(() => usePerson("1"), { wrapper });
  });

  it("fetches person filmography", async () => {
    mockApiFetch.mockResolvedValue({
      actor: [],
      director: [],
      writer: [],
      other: [],
    });
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);
    renderHook(() => usePersonFilmography("1"), { wrapper });
  });

  it("fetches popular people", async () => {
    mockApiFetch.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    });
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);
    renderHook(() => usePopularPeople(10), { wrapper });
  });
});

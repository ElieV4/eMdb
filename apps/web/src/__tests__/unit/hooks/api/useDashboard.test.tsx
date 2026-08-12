import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { waitFor } from "@testing-library/react";
import {
  useDashboardStats,
  usePopularTitles,
  useRecentWatches,
  useFollowedSeries,
  useRecommendations,
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

  it("maps backend title rows (snake_case) to Title (camelCase) for popular titles", async () => {
    mockApiFetch.mockResolvedValue({
      items: [
        {
          id: "t1",
          tmdb_id: 42,
          type: "film",
          titre_vo: "Original Title",
          titre_vf: "Titre Français",
          affiche_url: "/poster.jpg",
          date_sortie: "2020-01-01",
          note_imdb: "7.5",
          title_genres: [{ genres: { id: "g1", nom: "Drame" } }],
          title_countries: [{ countries: { id: "c1", nom: "France" } }],
        },
      ],
      total: 1,
      page: 1,
      limit: 12,
      totalPages: 1,
    });
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => usePopularTitles(12), { wrapper });

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data).toEqual([
      {
        id: "t1",
        tmdbId: 42,
        titre: "Original Title",
        titreOriginal: "Titre Français",
        type: "film",
        dateSortie: "2020-01-01",
        duree: undefined,
        note: 7.5,
        synopsis: undefined,
        afficheUrl: "/poster.jpg",
        genres: [{ id: "g1", nom: "Drame" }],
        pays: [{ id: "c1", nom: "France" }],
      },
    ]);
    expect(mockApiFetch).toHaveBeenCalledWith(
      expect.stringContaining("sort_by=note_imdb"),
    );
  });

  it("fetches user recommendations and maps them, forwarding appreciesFr", async () => {
    mockApiFetch.mockResolvedValue([
      {
        id: "t2",
        tmdb_id: 99,
        type: "serie",
        titre_vo: "Une Série",
        titre_vf: null,
        affiche_url: null,
        date_sortie: null,
        note_imdb: null,
      },
    ]);
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useRecommendations(10, true), { wrapper });

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data?.[0].id).toBe("t2");
    expect(mockApiFetch).toHaveBeenCalledWith(
      expect.stringContaining("/recommendations/user?"),
    );
    expect(mockApiFetch).toHaveBeenCalledWith(expect.stringContaining("appreciesFr=1"));
  });
});

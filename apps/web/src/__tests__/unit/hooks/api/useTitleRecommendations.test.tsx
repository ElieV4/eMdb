/**
 * Tests unitaires pour useTitleRecommendations.
 * Phase 3 - Pages de détail
 */

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTitleRecommendations } from "@/hooks/api/useTitleRecommendations";

jest.mock("@/lib/api/apiClient", () => ({
  apiFetch: jest.fn(),
}));

import { apiFetch } from "@/lib/api/apiClient";

const mockRecs = [
  {
    id: "r1",
    tmdb_id: 123,
    titre_vo: "Interstellar",
    titre_vf: null,
    affiche_url: "/interstellar.jpg",
    type: "film" as const,
    note_imdb: 8.6,
  },
];

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: 0 },
    },
  });
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("useTitleRecommendations", () => {
  it("fait l'appel API avec le bon endpoint", async () => {
    (apiFetch as jest.Mock).mockResolvedValue(mockRecs);

    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useTitleRecommendations("title-1"), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(apiFetch).toHaveBeenCalledWith("/titles/title-1/recommendations");
  });

  it("retourne les données mappées", async () => {
    (apiFetch as jest.Mock).mockResolvedValue(mockRecs);

    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useTitleRecommendations("title-1"), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockRecs);
    });
  });

  it("ne fait pas d'appel quand id est vide", () => {
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useTitleRecommendations(""), {
      wrapper,
    });

    expect(result.current.status).toBe("pending");
  });
});

/**
 * Tests unitaires pour useEpisode.
 * Phase 3 - Pages de détail
 */

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEpisode } from "@/hooks/api/useEpisode";

jest.mock("@/lib/api/apiClient", () => ({
  apiFetch: jest.fn(),
}));

import { apiFetch } from "@/lib/api/apiClient";

const mockEpisode = {
  id: "e1",
  numero: 1,
  titre: "The Vanishing of Will Byers",
  synopsis: "Un épisode culte.",
  date_sortie: "2016-07-15",
  duree_minutes: 45,
  image_url: "/still.jpg",
  season_id: "s1",
  seasons: { id: "s1", numero: 1, titre: "Saison 1", title_id: "t1" },
};

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
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe("useEpisode", () => {
  it("fait l'appel API avec le bon endpoint", async () => {
    (apiFetch as jest.Mock).mockResolvedValue(mockEpisode);

    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useEpisode("ep-1"), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(apiFetch).toHaveBeenCalledWith("/episodes/ep-1");
  });

  it("retourne les données mappées", async () => {
    (apiFetch as jest.Mock).mockResolvedValue(mockEpisode);

    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useEpisode("ep-1"), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockEpisode);
    });
  });

  it("ne fait pas d'appel quand id est vide", () => {
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useEpisode(""), { wrapper });

    expect(result.current.status).toBe("pending");
  });
});

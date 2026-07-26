/**
 * Tests unitaires pour useSeason.
 * Phase 3 - Pages de détail
 */

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSeason } from "@/hooks/api/useSeason";

jest.mock("@/lib/api/apiClient", () => ({
  apiFetch: jest.fn(),
}));

import { apiFetch } from "@/lib/api/apiClient";

const mockSeason = {
  id: "s1",
  numero: 1,
  titre: "Saison 1",
  date_sortie: "2016-07-15",
  synopsis: "Première saison.",
  episodes: [
    {
      id: "e1",
      numero: 1,
      titre: "Episode 1",
      date_sortie: "2016-07-15",
      duree_minutes: 45,
      image_url: "/still.jpg",
    },
  ],
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
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("useSeason", () => {
  it("fait l'appel API avec le bon endpoint", async () => {
    (apiFetch as jest.Mock).mockResolvedValue(mockSeason);

    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useSeason("title-1", 1), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(apiFetch).toHaveBeenCalledWith("/titles/title-1/seasons/1");
  });

  it("retourne les données mappées", async () => {
    (apiFetch as jest.Mock).mockResolvedValue(mockSeason);

    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useSeason("title-1", 1), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockSeason);
    });
  });

  it("ne fait pas d'appel quand titleId est vide", () => {
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useSeason("", 1), { wrapper });

    expect(result.current.status).toBe("pending");
  });
});

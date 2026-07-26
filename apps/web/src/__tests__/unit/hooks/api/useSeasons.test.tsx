/**
 * Tests unitaires pour useSeasons.
 * Phase 3 - Pages de détail
 */

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSeasons } from "@/hooks/api/useSeasons";

jest.mock("@/lib/api/apiClient", () => ({
  apiFetch: jest.fn(),
}));

import { apiFetch } from "@/lib/api/apiClient";

const mockSeasons = [
  {
    id: "s1",
    numero: 1,
    titre: "Saison 1",
    date_sortie: "2016-07-15",
    synopsis: null,
    nombre_episodes: 10,
  },
  {
    id: "s2",
    numero: 2,
    titre: "Saison 2",
    date_sortie: "2017-10-27",
    synopsis: null,
    nombre_episodes: 9,
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

describe("useSeasons", () => {
  it("fait l'appel API avec le bon endpoint", async () => {
    (apiFetch as jest.Mock).mockResolvedValue(mockSeasons);

    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useSeasons("title-1"), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(apiFetch).toHaveBeenCalledWith("/titles/title-1/seasons");
  });

  it("retourne les données mappées", async () => {
    (apiFetch as jest.Mock).mockResolvedValue(mockSeasons);

    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useSeasons("title-1"), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockSeasons);
    });
  });

  it("ne fait pas d'appel quand titleId est vide", () => {
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useSeasons(""), { wrapper });

    expect(result.current.status).toBe("pending");
  });
});

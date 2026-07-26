/**
 * Tests unitaires pour useEpisodeCredits.
 * Phase 3 - Pages de détail
 */

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEpisodeCredits } from "@/hooks/api/useEpisodeCredits";

jest.mock("@/lib/api/apiClient", () => ({
  apiFetch: jest.fn(),
}));

import { apiFetch } from "@/lib/api/apiClient";

const mockCredits = {
  "Guest Stars": [
    {
      id: "c1",
      personnage: "Will Byers",
      ordre: 1,
      personne: { id: "p1", nom: "Noah Schnapp", photo_url: "/photo.jpg" },
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

describe("useEpisodeCredits", () => {
  it("fait l'appel API avec le bon endpoint", async () => {
    (apiFetch as jest.Mock).mockResolvedValue(mockCredits);

    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useEpisodeCredits("ep-1"), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(apiFetch).toHaveBeenCalledWith("/episodes/ep-1/credits");
  });

  it("retourne les données mappées", async () => {
    (apiFetch as jest.Mock).mockResolvedValue(mockCredits);

    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useEpisodeCredits("ep-1"), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockCredits);
    });
  });

  it("ne fait pas d'appel quand id est vide", () => {
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useEpisodeCredits(""), { wrapper });

    expect(result.current.status).toBe("pending");
  });
});

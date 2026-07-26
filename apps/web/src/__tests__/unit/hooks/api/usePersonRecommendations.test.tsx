/**
 * Tests unitaires pour usePersonRecommendations.
 * Phase 3 - Pages de détail
 */

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { usePersonRecommendations } from "@/hooks/api/usePersonRecommendations";

jest.mock("@/lib/api/apiClient", () => ({
  apiFetch: jest.fn(),
}));

import { apiFetch } from "@/lib/api/apiClient";

const mockRecs = [
  {
    id: "p1",
    tmdb_id: 123,
    nom: "Joseph Gordon-Levitt",
    photo_url: "/photo.jpg",
    genre: "Homme",
    bio: "Acteur américain.",
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

describe("usePersonRecommendations", () => {
  it("fait l'appel API avec le bon endpoint", async () => {
    (apiFetch as jest.Mock).mockResolvedValue(mockRecs);

    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => usePersonRecommendations("person-1"), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(apiFetch).toHaveBeenCalledWith("/people/person-1/recommendations");
  });

  it("retourne les données mappées", async () => {
    (apiFetch as jest.Mock).mockResolvedValue(mockRecs);

    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => usePersonRecommendations("person-1"), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockRecs);
    });
  });

  it("ne fait pas d'appel quand id est vide", () => {
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => usePersonRecommendations(""), {
      wrapper,
    });

    expect(result.current.status).toBe("pending");
  });
});

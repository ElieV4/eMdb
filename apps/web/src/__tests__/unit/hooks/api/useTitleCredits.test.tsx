/**
 * Tests unitaires pour useTitleCredits.
 * Phase 3 - Pages de détail
 */

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTitleCredits } from "@/hooks/api/useTitleCredits";

jest.mock("@/lib/api/apiClient", () => ({
  apiFetch: jest.fn(),
}));

import { apiFetch } from "@/lib/api/apiClient";

const mockCredits = {
  Acteurs: [
    {
      id: "c1",
      personnage: "Dom Cobb",
      ordre: 1,
      personne: { id: "p1", nom: "Leonardo DiCaprio", photo_url: "/photo.jpg" },
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

describe("useTitleCredits", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fait l'appel API avec le bon endpoint", async () => {
    (apiFetch as jest.Mock).mockResolvedValue(mockCredits);

    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useTitleCredits("title-1"), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(apiFetch).toHaveBeenCalledWith("/titles/title-1/credits");
  });

  it("retourne les données mappées", async () => {
    (apiFetch as jest.Mock).mockResolvedValue(mockCredits);

    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useTitleCredits("title-1"), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockCredits);
    });
  });

  it("ne fait pas d'appel quand titleId est vide", () => {
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useTitleCredits(""), { wrapper });

    expect(result.current.status).toBe("pending");
    expect(apiFetch).not.toHaveBeenCalled();
  });
});

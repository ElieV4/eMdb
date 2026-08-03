import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useCalendar } from "@/hooks/api/useCalendar";
import { apiFetch } from "@/lib/api/apiClient";

jest.mock("@/lib/api/apiClient");

const mockedApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

function createWrapper() {
  const queryClient = new QueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const mockCalendar = [
  {
    title_id: "1",
    titre_vo: "Test Series",
    titre_vf: "Série Test",
    affiche_url: null,
    saison: 1,
    episode_numero: 2,
    episode_titre: "Pilot",
    date_diffusion: new Date("2026-08-01T00:00:00.000Z").toISOString(),
    nb_non_vus: 3,
  },
];

describe("useCalendar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApiFetch.mockReset();
  });

  it("fetches calendar entries", async () => {
    mockedApiFetch.mockResolvedValue({
      items: mockCalendar,
      total: mockCalendar.length,
      page: 1,
      limit: 100,
      totalPages: 1,
    } as any);

    const { result } = renderHook(() => useCalendar(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockCalendar);
    expect(mockedApiFetch).toHaveBeenCalledWith("/calendar?limit=100");
  });
});

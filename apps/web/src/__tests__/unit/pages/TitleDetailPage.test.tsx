/**
 * Tests unitaires pour la page détail titre/série.
 * Bug #13 — Vérifie la présence des fonctionnalités utilisateur : watch, follow, rating.
 */

jest.mock("@/hooks/api/useTitles", () => ({
  useTitle: () => ({
    data: {
      id: "title-1",
      type: "serie",
      titre_vo: "Stranger Things",
      titre_vf: "Stranger Things",
      note_imdb: 8.7,
      affiche_url: "/poster.jpg",
      synopsis: "Synopsis",
      date_sortie: "2016-07-15",
      duree_minutes: 50,
      genres: [],
      pays: [],
      studios: [],
      statut: "en_cours",
      is_animation: false,
      title_genres: [],
      title_countries: [],
      title_studios: [],
      seasons: [],
    },
    isLoading: false,
    isError: false,
  }),
  useTitleCredits: () => ({
    data: [],
    isLoading: false,
    isError: false,
  }),
  useTitleRecommendations: () => ({
    data: [],
    isLoading: false,
    isError: false,
  }),
  useSeasons: () => ({
    data: [],
    isLoading: false,
    isError: false,
  }),
  useTitleRatingsSummary: () => ({
    data: { moyenne: 8.7, count: 10 },
    isLoading: false,
    isError: false,
  }),
}));

jest.mock("@/hooks/api/useUpsertRating", () => ({
  useUpsertRating: () => ({
    mutate: jest.fn(),
    isPending: false,
  }),
}));

jest.mock("@/components/watches/WatchButton", () => ({
  WatchButton: ({ titleId }: { titleId?: string }) => (
    <div data-testid="watch-button">Watch {titleId}</div>
  ),
}));

jest.mock("@/components/watches/FollowButton", () => ({
  FollowButton: ({ titleId }: { titleId: string }) => (
    <div data-testid="follow-button">Follow {titleId}</div>
  ),
}));

jest.mock("@/components/ratings/RatingInput", () => ({
  RatingInput: ({ value }: { value?: number | null }) => (
    <div data-testid="rating-input">Rating {value}</div>
  ),
}));

jest.mock("@/store/authStore", () => ({
  useAuthStore: () => ({
    isAuthenticated: true,
  }),
}));

import { render, screen } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/api/queryClient";
import TitleDetailPage from "@/app/titles/[id]/page";

function renderWithClient(ui: React.ReactNode) {
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("TitleDetailPage", () => {
  it("affiche le bouton Marquer comme vu quand connecte", () => {
    renderWithClient(<TitleDetailPage params={{ id: "title-1" }} />);
    expect(screen.getByTestId("watch-button")).toBeInTheDocument();
  });

  it("affiche le bouton Suivre pour une série quand connecte", () => {
    renderWithClient(<TitleDetailPage params={{ id: "title-1" }} />);
    expect(screen.getByTestId("follow-button")).toBeInTheDocument();
  });

  it("affiche le composant de notation quand connecte", () => {
    renderWithClient(<TitleDetailPage params={{ id: "title-1" }} />);
    expect(screen.getByTestId("rating-input")).toBeInTheDocument();
  });
});

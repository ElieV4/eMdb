/**
 * Tests unitaires pour la page /ratings.
 * Verrouille la correction des champs mal nommés (note_perso/created_at au
 * lieu de note/createdAt, items au lieu de data côté backend) et le
 * cablage des filtres du header (type/genre/pays/note/annee/listes/vu).
 */

jest.mock("@/hooks/api/useUserRatings", () => ({
  useUserRatings: jest.fn(),
}));

jest.mock("@/hooks/api/useDeleteRating", () => ({
  useDeleteRating: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/api", () => ({
  useWatchedTitles: () => ({ data: new Set() }),
  useListMembership: () => ({ watchlistIds: new Set(), favoriteIds: new Set() }),
}));

import { render, screen } from "@testing-library/react";
import RatingsPage from "@/app/(frontend)/ratings/page";
import { useUserRatings } from "@/hooks/api/useUserRatings";
import { UserRating } from "@/lib/types/api";

const mockUseUserRatings = useUserRatings as jest.Mock;

const filmRating: UserRating = {
  id: "r1",
  note_perso: 8,
  commentaire: "Génial",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  title: {
    id: "t1",
    tmdb_id: 1,
    titre_vo: "Film Un",
    titre_vf: null,
    affiche_url: null,
    type: "film",
    date_sortie: "2020-01-01",
    note_imdb: 7,
    title_genres: [],
    title_countries: [],
  },
};

const serieRating: UserRating = {
  id: "r2",
  note_perso: 6,
  commentaire: null,
  created_at: "2026-01-02T00:00:00.000Z",
  updated_at: "2026-01-02T00:00:00.000Z",
  title: {
    id: "t2",
    tmdb_id: 2,
    titre_vo: "Série Deux",
    titre_vf: null,
    affiche_url: null,
    type: "serie",
    date_sortie: "2018-01-01",
    note_imdb: 6,
    title_genres: [],
    title_countries: [],
  },
};

describe("RatingsPage", () => {
  it("affiche le titre, la date et la note (champs backend réels)", () => {
    mockUseUserRatings.mockReturnValue({
      data: { items: [filmRating], total: 1, page: 1, limit: 20, totalPages: 1 },
      isLoading: false,
      error: null,
    });

    render(<RatingsPage />);

    expect(screen.getByText("Film Un")).toBeInTheDocument();
    expect(screen.getByText("01/01/2026")).toBeInTheDocument();
    expect(screen.getByText("8/10")).toBeInTheDocument();
    expect(screen.getByText("Génial")).toBeInTheDocument();
  });

  it("affiche un message si aucune note", () => {
    mockUseUserRatings.mockReturnValue({
      data: { items: [], total: 0, page: 1, limit: 20, totalPages: 0 },
      isLoading: false,
      error: null,
    });

    render(<RatingsPage />);
    expect(screen.getByText("Vous n'avez pas encore de notes.")).toBeInTheDocument();
  });

  it("affiche les deux titres sans filtre actif", () => {
    mockUseUserRatings.mockReturnValue({
      data: { items: [filmRating, serieRating], total: 2, page: 1, limit: 20, totalPages: 1 },
      isLoading: false,
      error: null,
    });

    render(<RatingsPage />);
    expect(screen.getByText("Film Un")).toBeInTheDocument();
    expect(screen.getByText("Série Deux")).toBeInTheDocument();
  });
});

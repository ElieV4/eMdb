/**
 * Tests unitaires pour la page détail série (SeriesDetailPage).
 * Bug #12 — Vérifie que la page /series/:id affiche les saisons.
 */

jest.mock("@/hooks/api/useTitles", () => ({
  useTitle: () => ({
    data: {
      id: "serie-1",
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
}));

jest.mock("@/hooks/api/useTitleCredits", () => ({
  useTitleCredits: () => ({
    data: [],
    isLoading: false,
    isError: false,
  }),
}));

jest.mock("@/hooks/api/useTitleRecommendations", () => ({
  useTitleRecommendations: () => ({
    data: [],
    isLoading: false,
    isError: false,
  }),
}));

jest.mock("@/hooks/api/useSeasons", () => ({
  useSeasons: () => ({
    data: [
      {
        id: "s1",
        numero: 1,
        titre: "Saison 1",
        date_sortie: "2016-07-15",
        synopsis: null,
        nombre_episodes: 8,
      },
    ],
    isLoading: false,
    isError: false,
  }),
}));

import { render, screen } from "@testing-library/react";
import SeriesDetailPage from "@/app/series/[id]/page";

describe("SeriesDetailPage", () => {
  it("affiche le titre de la série", () => {
    render(<SeriesDetailPage params={{ id: "serie-1" }} />);
    expect(screen.getByText("Stranger Things")).toBeInTheDocument();
  });

  it("affiche la section Saisons", () => {
    render(<SeriesDetailPage params={{ id: "serie-1" }} />);
    expect(screen.getByText("Saisons")).toBeInTheDocument();
  });

  it("affiche les saisons de la série", () => {
    render(<SeriesDetailPage params={{ id: "serie-1" }} />);
    expect(screen.getByText("Saison 1")).toBeInTheDocument();
  });
});

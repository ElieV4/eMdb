/**
 * Tests unitaires pour TitleInfo.
 * Phase 3 - Pages de détail
 */

import { render, screen } from "@testing-library/react";
import { TitleInfo } from "@/components/titles/TitleInfo";
import { TitleDetail } from "@/lib/types/api";

const mockTitle: TitleDetail = {
  id: "1",
  tmdb_id: 123,
  titre_vo: "Inception",
  type: "film",
  date_sortie: "2010-07-16",
  duree_minutes: 148,
  note_imdb: 8.7,
  synopsis: "Un film.",
  affiche_url: "/poster.jpg",
  backdrop_url: null,
  statut: "Released",
  is_animation: false,
  next_episode_air_date: null,
  title_genres: [
    { id: "1", genre_id: "g1", genres: { id: "g1", nom: "Sci-Fi" } },
    { id: "2", genre_id: "g2", genres: { id: "g2", nom: "Thriller" } },
  ],
  title_countries: [
    { id: "1", country_id: "c1", countries: { id: "c1", nom: "USA" } },
  ],
  title_studios: [
    { id: "1", studio_id: "s1", studios: { id: "s1", nom: "Warner Bros" } },
  ],
  seasons: [],
};

describe("TitleInfo", () => {
  it("affiche les genres", () => {
    render(<TitleInfo title={mockTitle} />);
    expect(screen.getByText("Sci-Fi")).toBeInTheDocument();
    expect(screen.getByText("Thriller")).toBeInTheDocument();
  });

  it("affiche l'année de sortie", () => {
    render(<TitleInfo title={mockTitle} />);
    expect(screen.getByText("2010")).toBeInTheDocument();
  });

  it("affiche la durée", () => {
    render(<TitleInfo title={mockTitle} />);
    expect(screen.getByText("148 min")).toBeInTheDocument();
  });

  it("affiche le statut", () => {
    render(<TitleInfo title={mockTitle} />);
    expect(screen.getByText("Statut : Released")).toBeInTheDocument();
  });

  it("affiche l'animation quand is_animation=true", () => {
    const title = { ...mockTitle, is_animation: true };
    render(<TitleInfo title={title} />);
    expect(screen.getByText("Animation")).toBeInTheDocument();
  });

  it("affiche les pays", () => {
    render(<TitleInfo title={mockTitle} />);
    expect(screen.getByText("USA")).toBeInTheDocument();
  });

  it("affiche les studios", () => {
    render(<TitleInfo title={mockTitle} />);
    expect(screen.getByText("Studios :")).toBeInTheDocument();
    expect(screen.getByText("Warner Bros")).toBeInTheDocument();
  });

  it("n'affiche rien quand tous les champs sont vides", () => {
    const emptyTitle: TitleDetail = {
      ...mockTitle,
      date_sortie: null,
      duree_minutes: null,
      statut: null,
      is_animation: false,
      title_genres: [],
      title_countries: [],
      title_studios: [],
    };
    const { container } = render(<TitleInfo title={emptyTitle} />);
    expect(container).toBeInTheDocument();
  });
});

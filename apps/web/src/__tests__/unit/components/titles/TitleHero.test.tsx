/**
 * Tests unitaires pour TitleHero.
 * Phase 3 - Pages de détail
 */

import { render, screen } from "@testing-library/react";
import { TitleHero } from "@/components/titles/TitleHero";
import { TitleDetail } from "@/lib/types/api";

const mockTitle: TitleDetail = {
  id: "1",
  tmdb_id: 123,
  titre_vo: "Inception",
  titre_vf: "Inception",
  type: "film",
  date_sortie: "2010-07-16",
  duree_minutes: 148,
  note_imdb: 8.7,
  synopsis: "Un film de science-fiction.",
  affiche_url: "/poster.jpg",
  backdrop_url: "/backdrop.jpg",
  statut: "Released",
  is_animation: false,
  next_episode_air_date: null,
  title_genres: [
    { id: "1", genre_id: "g1", genres: { id: "g1", nom: "Sci-Fi" } },
  ],
  title_countries: [
    { id: "1", country_id: "c1", countries: { id: "c1", nom: "USA" } },
  ],
  title_studios: [
    { id: "1", studio_id: "s1", studios: { id: "s1", nom: "Warner Bros" } },
  ],
  seasons: [],
};

const mockSerie: TitleDetail = {
  ...mockTitle,
  id: "2",
  type: "serie",
  titre_vo: "Stranger Things",
  next_episode_air_date: "2023-10-27",
  seasons: [],
};

describe("TitleHero", () => {
  it("affiche le titre VO", () => {
    render(<TitleHero title={mockTitle} />);
    expect(screen.getByText("Inception")).toBeInTheDocument();
  });

  it("affiche le titre VF quand différent du VO", () => {
    const title = { ...mockTitle, titre_vf: "Inception VF" };
    render(<TitleHero title={title} />);
    expect(screen.getByText("Inception VF")).toBeInTheDocument();
  });

  it("affiche l'année de sortie", () => {
    render(<TitleHero title={mockTitle} />);
    expect(screen.getByText("(2010)")).toBeInTheDocument();
  });

  it("affiche la note IMDB", () => {
    render(<TitleHero title={mockTitle} />);
    expect(screen.getByText("8.7")).toBeInTheDocument();
  });

  it("affiche le type Film pour un film", () => {
    render(<TitleHero title={mockTitle} />);
    const badges = screen.getAllByText("Film");
    expect(badges.length).toBeGreaterThan(0);
  });

  it("affiche le type Série pour une série", () => {
    render(<TitleHero title={mockSerie} />);
    const badges = screen.getAllByText("Série");
    expect(badges.length).toBeGreaterThan(0);
  });

  it("affiche le statut quand disponible", () => {
    render(<TitleHero title={mockTitle} />);
    expect(screen.getByText("Released")).toBeInTheDocument();
  });

  it("affiche le synopsis quand disponible", () => {
    render(<TitleHero title={mockTitle} />);
    expect(screen.getByText("Un film de science-fiction.")).toBeInTheDocument();
  });

  it("n'affiche pas le titre VF quand identique au VO", () => {
    render(<TitleHero title={mockTitle} />);
    expect(screen.queryByText("Inception")).toBeInTheDocument();
    // titre_vf === titre_vo, donc pas de titre VF supplémentaire
  });
});

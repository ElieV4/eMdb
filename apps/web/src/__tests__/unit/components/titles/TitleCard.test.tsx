/**
 * Tests unitaires pour TitleCard.
 * Phase 2 - Recherche & Navigation
 */

import { render, screen } from "@testing-library/react";
import { TitleCard } from "@/components/titles/TitleCard";
import { TitleSearchResult } from "@/lib/types/api";

// Mock des données de test
const mockTitle: TitleSearchResult = {
  id: "1",
  tmdbId: 123,
  titre: "Inception",
  titreOriginal: "Inception",
  type: "film",
  dateSortie: "2010-07-16",
  duree: 148,
  note: 8.7,
  afficheUrl: "/path/to/poster.jpg",
  genres: [{ id: "1", nom: "Science-Fiction" }],
  pays: [{ id: "1", nom: "États-Unis" }],
};

const mockTitleNoPoster: TitleSearchResult = {
  id: "2",
  tmdbId: 456,
  titre: "Unknown Movie",
  titreOriginal: "Unknown Movie",
  type: "film",
  dateSortie: "2020-01-01",
};

const mockTitleSerie: TitleSearchResult = {
  id: "3",
  tmdbId: 789,
  titre: "Stranger Things",
  titreOriginal: "Stranger Things",
  type: "serie",
  dateSortie: "2016-07-15",
  afficheUrl: "/path/to/series-poster.jpg",
};

describe("TitleCard", () => {
  it("affiche le titre correctement", () => {
    render(<TitleCard title={mockTitle} />);
    expect(screen.getByText("Inception")).toBeInTheDocument();
  });

  it("affiche l'année de sortie", () => {
    render(<TitleCard title={mockTitle} />);
    expect(screen.getByText("2010")).toBeInTheDocument();
  });

  it("affiche le type (Film/Série)", () => {
    render(<TitleCard title={mockTitle} />);
    expect(screen.getByText("Film")).toBeInTheDocument();

    render(<TitleCard title={mockTitleSerie} />);
    expect(screen.getByText("Série")).toBeInTheDocument();
  });

  it("affiche la note quand disponible", () => {
    render(<TitleCard title={mockTitle} />);
    expect(screen.getByText("8.7")).toBeInTheDocument();
  });

  it("affiche un fallback quand afficheUrl est absent", () => {
    render(<TitleCard title={mockTitleNoPoster} />);
    // Devrait afficher un placeholder
    const placeholder = screen.getByAltText("I");
    expect(placeholder).toBeInTheDocument();
  });

  it("applique le style compact quand compact=true", () => {
    render(<TitleCard title={mockTitle} compact />);
    const card = screen.getByText("Inception").parentElement;
    expect(card).toBeInTheDocument();
  });

  it("n'affiche pas la note quand elle est absente", () => {
    const titleNoRating = { ...mockTitle, note: undefined };
    render(<TitleCard title={titleNoRating} />);
    expect(screen.queryByText("8.7")).not.toBeInTheDocument();
  });
});

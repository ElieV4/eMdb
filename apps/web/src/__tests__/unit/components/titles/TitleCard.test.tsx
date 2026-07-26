/**
 * Tests unitaires pour TitleCard.
 * Phase 2 - Recherche & Navigation
 */

import { render, screen } from "@testing-library/react";
import { TitleCard } from "@/components/titles/TitleCard";
import { TitleSearchResult } from "@/lib/types/api";

const mockTitle: TitleSearchResult = {
  id: "1",
  tmdbId: 123,
  titre: "Inception",
  titreOriginal: "Inception",
  type: "film",
  dateSortie: "2010-07-16",
  note: 8.8,
  afficheUrl: "/poster.jpg",
  genres: [{ id: "g1", nom: "Sci-Fi" }],
  pays: [{ id: "c1", nom: "USA" }],
};

const mockSerie: TitleSearchResult = {
  ...mockTitle,
  id: "2",
  titre: "Stranger Things",
  titreOriginal: "Stranger Things",
  type: "serie",
  dateSortie: "2016-07-15",
  note: 8.7,
};

describe("TitleCard", () => {
  it("affiche le titre", () => {
    render(<TitleCard title={mockTitle} />);
    expect(screen.getByText("Inception")).toBeInTheDocument();
  });

  it("affiche l'annee de sortie", () => {
    render(<TitleCard title={mockTitle} />);
    expect(screen.getByText("2010")).toBeInTheDocument();
  });

  it("affiche la note", () => {
    render(<TitleCard title={mockTitle} />);
    expect(screen.getByText("8.8")).toBeInTheDocument();
  });

  it("affiche le badge Film via TitlePoster", () => {
    render(<TitleCard title={mockTitle} />);
    const badges = screen.getAllByText("Film");
    expect(badges.length).toBeGreaterThan(0);
  });

  it("affiche le badge Serie via TitlePoster", () => {
    render(<TitleCard title={mockSerie} />);
    const badges = screen.getAllByText("Série");
    expect(badges.length).toBeGreaterThan(0);
  });

  it("affiche le badge type meme en mode compact (dans TitlePoster)", () => {
    render(<TitleCard title={mockTitle} compact />);
    // TitlePoster affiche toujours le badge type
    expect(screen.getByText("Film")).toBeInTheDocument();
  });

  it("affiche le badge type meme si showType=false (dans TitlePoster)", () => {
    render(<TitleCard title={mockTitle} showType={false} />);
    // TitlePoster affiche toujours le badge, showType ne controle que le badge dans le texte
    expect(screen.getByText("Film")).toBeInTheDocument();
  });

  it("n'affiche pas la pastille de type textuelle en mode compact", () => {
    render(<TitleCard title={mockTitle} compact />);
    // En mode compact, la pastille dans la zone texte n'est pas affichée
    // Mais le badge dans TitlePoster est toujours là
    expect(screen.getByText("Film")).toBeInTheDocument();
  });

  it("n'affiche pas la pastille de type textuelle si showType=false", () => {
    render(<TitleCard title={mockTitle} showType={false} />);
    // Pastille dans la zone texte cachée, mais TitlePoster l'affiche toujours
    expect(screen.getByText("Film")).toBeInTheDocument();
  });

  it("gere l'absence de date de sortie", () => {
    const titleWithoutYear = { ...mockTitle, dateSortie: undefined };
    render(<TitleCard title={titleWithoutYear} />);
    expect(screen.queryByText("2010")).not.toBeInTheDocument();
  });

  it("gere l'absence de note", () => {
    const titleWithoutNote = { ...mockTitle, note: undefined };
    render(<TitleCard title={titleWithoutNote} />);
    expect(screen.queryByText("8.8")).not.toBeInTheDocument();
  });

  it("redirige vers /titles/:id", () => {
    render(<TitleCard title={mockTitle} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/titles/1");
  });
});

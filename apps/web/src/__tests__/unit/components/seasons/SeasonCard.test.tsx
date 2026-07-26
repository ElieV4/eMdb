/**
 * Tests unitaires pour SeasonCard.
 * Phase 3 - Pages de détail
 */

import { render, screen } from "@testing-library/react";
import { SeasonCard } from "@/components/seasons/SeasonCard";
import { SeasonSummary } from "@/lib/types/api";

const mockSeason: SeasonSummary = {
  id: "s1",
  numero: 1,
  titre: "Saison 1",
  date_sortie: "2016-07-15",
  synopsis: "Première saison.",
  nombre_episodes: 10,
};

const mockSeasonNoTitle: SeasonSummary = {
  id: "s2",
  numero: 2,
  titre: null,
  date_sortie: null,
  synopsis: null,
  nombre_episodes: 8,
};

describe("SeasonCard", () => {
  it("affiche le titre de la saison", () => {
    render(<SeasonCard season={mockSeason} titleId="t1" />);
    expect(screen.getByText("Saison 1")).toBeInTheDocument();
  });

  it("affiche le numéro de saison quand titre est null", () => {
    render(<SeasonCard season={mockSeasonNoTitle} titleId="t1" />);
    expect(screen.getByText("Saison 2")).toBeInTheDocument();
  });

  it("affiche le nombre d'épisodes", () => {
    render(<SeasonCard season={mockSeason} titleId="t1" />);
    expect(screen.getByText("10 épisode(s)")).toBeInTheDocument();
  });

  it("affiche l'année de sortie", () => {
    render(<SeasonCard season={mockSeason} titleId="t1" />);
    expect(screen.getByText("2016")).toBeInTheDocument();
  });

  it("n'affiche pas l'année quand date_sortie est null", () => {
    render(<SeasonCard season={mockSeasonNoTitle} titleId="t1" />);
    expect(screen.queryByText("2016")).not.toBeInTheDocument();
  });

  it("génère le bon lien vers la saison", () => {
    render(<SeasonCard season={mockSeason} titleId="t1" />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/series/t1/seasons/1");
  });
});

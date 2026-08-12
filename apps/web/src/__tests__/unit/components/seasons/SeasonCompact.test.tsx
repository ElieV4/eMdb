/**
 * Tests unitaires pour SeasonCompact — icône "vu" et progression vus/total
 * quand une saison est entièrement regardée.
 */

import { render, screen } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/api/queryClient";
import { SeasonCompact } from "@/components/seasons/SeasonCompact";
import { SeasonSummary } from "@/lib/types/api";

function renderCompact(ui: React.ReactNode) {
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const mockSeason: SeasonSummary = {
  id: "s1",
  numero: 1,
  titre: "Saison 1",
  date_sortie: "2020-01-01",
  nombre_episodes: 85,
};

describe("SeasonCompact", () => {
  it("affiche le nombre d'épisodes seul sans progression", () => {
    renderCompact(<SeasonCompact season={mockSeason} titleId="t1" />);
    expect(screen.getByText("85 épisode(s)")).toBeInTheDocument();
  });

  it("affiche vus/total quand la progression est fournie", () => {
    renderCompact(
      <SeasonCompact season={mockSeason} titleId="t1" progress={{ vus: 45, total: 85 }} />,
    );
    expect(screen.getByText("45/85 épisode(s)")).toBeInTheDocument();
  });

  it("affiche l'icône 'vu' quand tous les épisodes sont vus", () => {
    renderCompact(
      <SeasonCompact season={mockSeason} titleId="t1" progress={{ vus: 85, total: 85 }} />,
    );
    expect(screen.getByLabelText("Saison entièrement vue")).toBeInTheDocument();
  });

  it("n'affiche pas l'icône 'vu' si la saison n'est pas terminée", () => {
    renderCompact(
      <SeasonCompact season={mockSeason} titleId="t1" progress={{ vus: 45, total: 85 }} />,
    );
    expect(screen.queryByLabelText("Saison entièrement vue")).not.toBeInTheDocument();
  });
});

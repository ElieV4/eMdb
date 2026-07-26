/**
 * Tests unitaires pour EpisodeCard.
 * Phase 3 - Pages de détail
 */

import { render, screen } from "@testing-library/react";
import { EpisodeCard } from "@/components/seasons/EpisodeCard";
import { EpisodeRowItem } from "@/components/seasons/EpisodeRow";

const mockEpisode: EpisodeRowItem = {
  id: "e1",
  numero: 3,
  titre: "The Power of Three",
  synopsis: null,
  date_sortie: "2017-10-27",
  duree_minutes: 50,
  image_url: "/still.jpg",
};

describe("EpisodeCard", () => {
  it("affiche le titre de l'épisode", () => {
    render(<EpisodeCard episode={mockEpisode} titleId="t1" seasonNumero={2} />);
    expect(screen.getByText("The Power of Three")).toBeInTheDocument();
  });

  it("affiche le badge E3", () => {
    render(<EpisodeCard episode={mockEpisode} titleId="t1" seasonNumero={2} />);
    expect(screen.getByText("E3")).toBeInTheDocument();
  });

  it("affiche l'année de sortie", () => {
    render(<EpisodeCard episode={mockEpisode} titleId="t1" seasonNumero={2} />);
    expect(screen.getByText("2017")).toBeInTheDocument();
  });

  it("affiche la durée", () => {
    render(<EpisodeCard episode={mockEpisode} titleId="t1" seasonNumero={2} />);
    expect(screen.getByText("50 min")).toBeInTheDocument();
  });

  it("génère le bon lien vers l'épisode", () => {
    render(<EpisodeCard episode={mockEpisode} titleId="t1" seasonNumero={2} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/episodes/e1");
  });

  it("applique le style watched quand isWatched=true", () => {
    render(
      <EpisodeCard
        episode={mockEpisode}
        titleId="t1"
        seasonNumero={2}
        isWatched
      />,
    );
    const badge = screen.getByText("E3");
    expect(badge).toHaveClass("bg-primary");
  });
});

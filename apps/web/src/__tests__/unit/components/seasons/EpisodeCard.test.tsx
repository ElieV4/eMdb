/**
 * Tests unitaires pour EpisodeCard.
 * Phase 3 - Pages de détail
 */

import { render, screen } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/api/queryClient";
import { EpisodeCard } from "@/components/seasons/EpisodeCard";
import { EpisodeRowItem } from "@/components/seasons/EpisodeRow";

// EpisodeCard rend désormais TitleWatchedButton, qui utilise useMutation —
// nécessite un QueryClientProvider (même convention que TitleCard.test.tsx).
function renderCard(ui: React.ReactNode) {
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

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
    renderCard(<EpisodeCard episode={mockEpisode} titleId="t1" seasonNumero={2} />);
    expect(screen.getByText("The Power of Three")).toBeInTheDocument();
  });

  it("affiche le badge E3", () => {
    renderCard(<EpisodeCard episode={mockEpisode} titleId="t1" seasonNumero={2} />);
    expect(screen.getByText("E3")).toBeInTheDocument();
  });

  it("affiche la date de sortie complète", () => {
    renderCard(<EpisodeCard episode={mockEpisode} titleId="t1" seasonNumero={2} />);
    expect(screen.getByText("27/10/2017")).toBeInTheDocument();
  });

  it("affiche la durée", () => {
    renderCard(<EpisodeCard episode={mockEpisode} titleId="t1" seasonNumero={2} />);
    expect(screen.getByText("50 min")).toBeInTheDocument();
  });

  it("génère le bon lien vers l'épisode", () => {
    renderCard(<EpisodeCard episode={mockEpisode} titleId="t1" seasonNumero={2} />);
    const links = screen.getAllByRole("link");
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link).toHaveAttribute("href", "/episodes/e1");
    }
  });

  it("applique le style watched quand isWatched=true", () => {
    renderCard(
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

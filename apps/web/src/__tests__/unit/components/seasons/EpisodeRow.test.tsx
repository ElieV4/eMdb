/**
 * Tests unitaires pour EpisodeRow.
 * Phase 3 - Pages de détail
 */

import { render, screen } from "@testing-library/react";
import { EpisodeRow } from "@/components/seasons/EpisodeRow";
import { EpisodeRowItem } from "@/components/seasons/EpisodeRow";

const mockEpisode: EpisodeRowItem = {
  id: "e1",
  numero: 1,
  titre: "The Vanishing of Will Byers",
  synopsis: "Un épisode culte.",
  date_sortie: "2016-07-15",
  duree_minutes: 45,
  image_url: "/still.jpg",
};

const mockEpisodeNoImage: EpisodeRowItem = {
  id: "e2",
  numero: 2,
  titre: "The Weirdo on Maple Street",
  synopsis: null,
  date_sortie: null,
  duree_minutes: null,
  image_url: null,
};

describe("EpisodeRow", () => {
  it("affiche le titre de l'épisode", () => {
    render(
      <EpisodeRow episode={mockEpisode} titleId="t1" seasonNumero={1} />,
    );
    expect(screen.getByText("The Vanishing of Will Byers")).toBeInTheDocument();
  });

  it("affiche le numéro S/E", () => {
    render(
      <EpisodeRow episode={mockEpisode} titleId="t1" seasonNumero={1} />,
    );
    expect(screen.getByText("S1 E01")).toBeInTheDocument();
  });

  it("affiche la date de sortie", () => {
    render(
      <EpisodeRow episode={mockEpisode} titleId="t1" seasonNumero={1} />,
    );
    expect(screen.getByText("15/07/2016")).toBeInTheDocument();
  });

  it("affiche la durée", () => {
    render(
      <EpisodeRow episode={mockEpisode} titleId="t1" seasonNumero={1} />,
    );
    expect(screen.getByText("45 min")).toBeInTheDocument();
  });

  it("affiche un placeholder quand image_url est null", () => {
    render(
      <EpisodeRow
        episode={mockEpisodeNoImage}
        titleId="t1"
        seasonNumero={1}
      />,
    );
    expect(screen.getByText("Pas image")).toBeInTheDocument();
  });

  it("génère le bon lien vers l'épisode", () => {
    render(
      <EpisodeRow episode={mockEpisode} titleId="t1" seasonNumero={1} />,
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/episodes/e1");
  });

  it("affiche l'icône de check quand isWatched=true", () => {
    render(
      <EpisodeRow
        episode={mockEpisode}
        titleId="t1"
        seasonNumero={1}
        isWatched
      />,
    );
    expect(screen.getByTestId("check-icon")).toBeInTheDocument();
  });
});

/**
 * Tests unitaires pour TitleRecommendations.
 * Phase 3 - Pages de détail
 */

import { render, screen } from "@testing-library/react";
import { TitleRecommendations } from "@/components/titles/TitleRecommendations";
import { TitleRecommendation } from "@/lib/types/api";

const mockRecs: TitleRecommendation[] = [
  {
    id: "1",
    tmdb_id: 123,
    titre_vo: "Interstellar",
    titre_vf: null,
    affiche_url: "/interstellar.jpg",
    type: "film",
    note_imdb: 8.6,
  },
  {
    id: "2",
    tmdb_id: 456,
    titre_vo: "Tenet",
    titre_vf: null,
    affiche_url: null,
    type: "film",
    note_imdb: 7.5,
  },
];

describe("TitleRecommendations", () => {
  it("affiche le titre de section", () => {
    render(<TitleRecommendations recommendations={mockRecs} />);
    expect(screen.getByText("Titres recommandés")).toBeInTheDocument();
  });

  it("affiche un message quand il n'y a aucune recommandation", () => {
    render(<TitleRecommendations recommendations={[]} />);
    expect(
      screen.getByText("Aucune recommandation disponible pour ce titre."),
    ).toBeInTheDocument();
  });

  it("affiche un message quand recommendations est undefined", () => {
    render(<TitleRecommendations recommendations={undefined as any} />);
    expect(
      screen.getByText("Aucune recommandation disponible pour ce titre."),
    ).toBeInTheDocument();
  });
});

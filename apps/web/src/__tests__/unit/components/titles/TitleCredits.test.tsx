/**
 * Tests unitaires pour TitleCredits.
 * Phase 3 - Pages de détail
 */

import { render, screen } from "@testing-library/react";
import { TitleCredits } from "@/components/titles/TitleCredits";
import { CreditGrouped } from "@/lib/types/api";

const mockCredits: CreditGrouped = {
  Acteurs: [
    {
      id: "c1",
      personnage: "Dom Cobb",
      ordre: 1,
      personne: { id: "p1", nom: "Leonardo DiCaprio", photo_url: "/photo.jpg" },
    },
    {
      id: "c2",
      personnage: "Arthur",
      ordre: 2,
      personne: { id: "p2", nom: "Joseph Gordon-Levitt", photo_url: null },
    },
  ],
  Réalisateur: [
    {
      id: "c3",
      personnage: null,
      ordre: null,
      personne: { id: "p3", nom: "Christopher Nolan", photo_url: null },
    },
  ],
};

describe("TitleCredits", () => {
  it("affiche les rôles (groupes)", () => {
    render(<TitleCredits credits={mockCredits} />);
    expect(screen.getByText("Acteurs")).toBeInTheDocument();
    expect(screen.getByText("Réalisateur")).toBeInTheDocument();
  });

  it("affiche les noms des personnes", () => {
    render(<TitleCredits credits={mockCredits} />);
    expect(screen.getByText("Leonardo DiCaprio")).toBeInTheDocument();
    expect(screen.getByText("Joseph Gordon-Levitt")).toBeInTheDocument();
    expect(screen.getByText("Christopher Nolan")).toBeInTheDocument();
  });

  it("affiche un message quand il n'y a aucun crédit", () => {
    render(<TitleCredits credits={{}} />);
    expect(
      screen.getByText("Aucun crédit disponible pour ce titre."),
    ).toBeInTheDocument();
  });

  it("gère les rôles avec des tableaux vides", () => {
    const credits: CreditGrouped = {
      Acteurs: [],
      Réalisateur: [
        {
          id: "c1",
          personnage: null,
          ordre: null,
          personne: { id: "p1", nom: "Nolan", photo_url: null },
        },
      ],
    };
    render(<TitleCredits credits={credits} />);
    expect(screen.getByText("Réalisateur")).toBeInTheDocument();
    expect(screen.getByText("Nolan")).toBeInTheDocument();
    expect(screen.queryByText("Acteurs")).not.toBeInTheDocument();
  });
});

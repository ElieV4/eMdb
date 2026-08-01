/**
 * Tests unitaires pour Filmography.
 * Phase 3 - Pages de détail
 */

import { render, screen } from "@testing-library/react";
import { Filmography } from "@/components/people/Filmography";
import { FilmographyGrouped } from "@/lib/types/api";

const mockFilmography: FilmographyGrouped = {
  Acteur: [
    {
      id: "f1",
      personnage: "Dom Cobb",
      ordre: 1,
      titre: {
        id: "t1",
        tmdb_id: 123,
        titre_vo: "Inception",
        titre_vf: "Inception",
        affiche_url: "/poster.jpg",
        type: "film",
        date_sortie: "2010-07-16",
        note_imdb: 8.7,
      },
      episode_id: null,
    },
  ],
  Réalisateur: [
    {
      id: "f2",
      personnage: null,
      ordre: null,
      titre: {
        id: "t2",
        tmdb_id: 456,
        titre_vo: "Tenet",
        titre_vf: null,
        affiche_url: null,
        type: "film",
        date_sortie: "2020-08-26",
        note_imdb: 7.5,
      },
      episode_id: null,
    },
  ],
};

describe("Filmography", () => {
  it("affiche les rôles (filtres + badges)", () => {
    render(<Filmography filmography={mockFilmography} />);
    // "Acteur"/"Réalisateur" apparaissent à la fois comme bouton de filtre
    // et comme badge de rôle sur chaque titre (modification C).
    expect(screen.getAllByText("Acteur").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Réalisateur").length).toBeGreaterThan(0);
  });

  it("affiche un message quand la filmographie est vide", () => {
    render(<Filmography filmography={{}} />);
    expect(
      screen.getByText("Aucune filmographie disponible pour cette personne."),
    ).toBeInTheDocument();
  });

  it("gère les rôles avec des tableaux vides", () => {
    const filmo: FilmographyGrouped = {
      Acteur: [],
      Réalisateur: [
        {
          id: "f1",
          personnage: null,
          ordre: null,
          titre: {
            id: "t1",
            tmdb_id: null,
            titre_vo: "Movie",
            titre_vf: null,
            affiche_url: null,
            type: "film",
            date_sortie: null,
            note_imdb: null,
          },
          episode_id: null,
        },
      ],
    };
    render(<Filmography filmography={filmo} />);
    expect(screen.getAllByText("Réalisateur").length).toBeGreaterThan(0);
    expect(screen.queryByText("Acteur")).not.toBeInTheDocument();
  });
});

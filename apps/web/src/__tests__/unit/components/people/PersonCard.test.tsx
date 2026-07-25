/**
 * Tests unitaires pour PersonCard.
 * Phase 2 - Recherche & Navigation
 */

import { render, screen } from "@testing-library/react";
import { PersonCard } from "@/components/people/PersonCard";
import { PersonSearchResult } from "@/lib/types/api";

// Mock des données de test
const mockPerson: PersonSearchResult = {
  id: "1",
  tmdbId: 123,
  nom: "Leonardo DiCaprio",
  photoUrl: "/path/to/photo.jpg",
  rolePrincipal: "Acteur",
};

const mockPersonNoPhoto: PersonSearchResult = {
  id: "2",
  tmdbId: 456,
  nom: "Unknown Actor",
  rolePrincipal: "Acteur",
};

const mockDirector: PersonSearchResult = {
  id: "3",
  tmdbId: 789,
  nom: "Christopher Nolan",
  photoUrl: "/path/to/director.jpg",
  rolePrincipal: "Réalisateur",
};

describe("PersonCard", () => {
  it("affiche le nom de la personne", () => {
    render(<PersonCard person={mockPerson} />);
    expect(screen.getByText("Leonardo DiCaprio")).toBeInTheDocument();
  });

  it("affiche le rôle principal", () => {
    render(<PersonCard person={mockPerson} />);
    expect(screen.getByText("Acteur")).toBeInTheDocument();

    render(<PersonCard person={mockDirector} />);
    expect(screen.getByText("Réalisateur")).toBeInTheDocument();
  });

  it("affiche un fallback quand photoUrl est absent", () => {
    render(<PersonCard person={mockPersonNoPhoto} />);
    // Devrait afficher un placeholder avec les initiales
    expect(screen.getByAltText("UA")).toBeInTheDocument();
  });

  it("applique le style compact quand compact=true", () => {
    render(<PersonCard person={mockPerson} compact />);
    const card = screen.getByText("Leonardo DiCaprio").parentElement;
    expect(card).toBeInTheDocument();
  });

  it("n'affiche pas le rôle quand rolePrincipal est absent", () => {
    const personNoRole = { ...mockPerson, rolePrincipal: undefined };
    render(<PersonCard person={personNoRole} />);
    expect(screen.queryByText("Acteur")).not.toBeInTheDocument();
  });
});

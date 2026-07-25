/**
 * Tests unitaires pour PersonBadge.
 * Phase 2 - Recherche & Navigation
 */

import { render, screen } from "@testing-library/react";
import { PersonBadge } from "@/components/people/PersonBadge";
import { Person } from "@/lib/types/api";

// Mock des données de test
const mockPerson: Person = {
  id: "1",
  tmdbId: 123,
  nom: "Leonardo DiCaprio",
  photoUrl: "/path/to/photo.jpg",
  dateNaissance: "1974-11-11",
  pays: "États-Unis",
  biographie: "Un acteur célèbre",
  wikiUrl: "https://en.wikipedia.org/wiki/Leonardo_DiCaprio",
};

const mockPersonNoPhoto: Person = {
  id: "2",
  tmdbId: 456,
  nom: "Unknown Actor",
  dateNaissance: "1990-01-01",
};

const mockPersonLongName: Person = {
  id: "3",
  tmdbId: 789,
  nom: "Very Long Actor Name That Should Be Truncated",
  photoUrl: "/path/to/photo.jpg",
};

describe("PersonBadge", () => {
  it("affiche le nom de la personne", () => {
    render(<PersonBadge person={mockPerson} />);
    expect(screen.getByText("Leonardo DiCaprio")).toBeInTheDocument();
  });

  it("affiche la photo quand disponible", () => {
    render(<PersonBadge person={mockPerson} />);
    const img = screen.getByAltText("Leonardo DiCaprio");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", expect.stringContaining("photo.jpg"));
  });

  it("affiche les initiales dans un avatar quand photoUrl est absent", () => {
    render(<PersonBadge person={mockPersonNoPhoto} />);
    expect(screen.getByText("UA")).toBeInTheDocument();
  });

  it("applique la taille par défaut (md)", () => {
    render(<PersonBadge person={mockPerson} />);
    const badge = screen.getByText("Leonardo DiCaprio").parentElement;
    expect(badge).toBeInTheDocument();
  });

  it("applique la taille sm", () => {
    render(<PersonBadge person={mockPerson} size="sm" />);
    const img = screen.getByAltText("Leonardo DiCaprio");
    expect(img.parentElement).toHaveClass("h-6");
  });

  it("applique la taille lg", () => {
    render(<PersonBadge person={mockPerson} size="lg" />);
    const img = screen.getByAltText("Leonardo DiCaprio");
    expect(img.parentElement).toHaveClass("h-10");
  });

  it("affiche le rôle quand showRole=true et role est fourni", () => {
    render(<PersonBadge person={mockPerson} role="Acteur" showRole />);
    expect(screen.getByText("Acteur")).toBeInTheDocument();
  });

  it("n'affiche pas le rôle quand showRole=false", () => {
    render(<PersonBadge person={mockPerson} role="Acteur" showRole={false} />);
    expect(screen.queryByText("Acteur")).not.toBeInTheDocument();
  });

  it("troncature le nom long", () => {
    render(<PersonBadge person={mockPersonLongName} />);
    // Le nom devrait être tronqué
    const nameElement = screen.getByText(/Very Long Actor Name/);
    expect(nameElement).toBeInTheDocument();
  });
});

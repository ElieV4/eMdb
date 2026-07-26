/**
 * Tests unitaires pour PersonCard.
 * Phase 2 - Recherche & Navigation
 */

import { render, screen } from "@testing-library/react";
import { PersonCard } from "@/components/people/PersonCard";
import { PersonSearchResult } from "@/lib/types/api";

const mockPerson: PersonSearchResult = {
  id: "1",
  tmdbId: 123,
  nom: "Leonardo DiCaprio",
  photoUrl: "/photo.jpg",
  rolePrincipal: "Acteur",
};

describe("PersonCard", () => {
  it("affiche le nom", () => {
    render(<PersonCard person={mockPerson} />);
    expect(screen.getByText("Leonardo DiCaprio")).toBeInTheDocument();
  });

  it("affiche le role principal", () => {
    render(<PersonCard person={mockPerson} />);
    expect(screen.getByText("Acteur")).toBeInTheDocument();
  });

  it("n'affiche pas le role si showRole=false", () => {
    render(<PersonCard person={mockPerson} showRole={false} />);
    expect(screen.queryByText("Acteur")).not.toBeInTheDocument();
  });

  it("n'affiche pas le role en mode compact", () => {
    render(<PersonCard person={mockPerson} compact />);
    expect(screen.queryByText("Acteur")).not.toBeInTheDocument();
  });

  it("redirige vers /people/:id", () => {
    render(<PersonCard person={mockPerson} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/people/1");
  });
});

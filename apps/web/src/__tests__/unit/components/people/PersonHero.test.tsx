/**
 * Tests unitaires pour PersonHero.
 * Phase 3 - Pages de détail
 */

import { render, screen } from "@testing-library/react";
import { PersonHero } from "@/components/people/PersonHero";
import { PersonDetail } from "@/lib/types/api";

const mockPerson: PersonDetail = {
  id: "p1",
  nom: "Leonardo DiCaprio",
  photo_url: "/photo.jpg",
  date_naissance: "1974-11-11",
  pays_id: "c1",
  bio: "Un acteur célèbre.",
  wiki_url: "https://en.wikipedia.org/wiki/Leonardo_DiCaprio",
  genre: "Homme",
  countries: { id: "c1", code: "US", nom: "États-Unis" },
};

const mockPersonNoPhoto: PersonDetail = {
  id: "p2",
  nom: "Unknown Actor",
  photo_url: null,
  date_naissance: null,
  pays_id: null,
  bio: null,
  wiki_url: null,
  genre: null,
  countries: null,
};

describe("PersonHero", () => {
  it("affiche le nom de la personne", () => {
    render(<PersonHero person={mockPerson} />);
    expect(screen.getByText("Leonardo DiCaprio")).toBeInTheDocument();
  });

  it("affiche le genre", () => {
    render(<PersonHero person={mockPerson} />);
    expect(screen.getByText("Acteur")).toBeInTheDocument();
  });

  it("affiche la date de naissance", () => {
    render(<PersonHero person={mockPerson} />);
    expect(screen.getByText(/Né\(e\) le/)).toBeInTheDocument();
  });

  it("affiche l'âge", () => {
    render(<PersonHero person={mockPerson} />);
    expect(screen.getByText(/\(\d+ ans\)/)).toBeInTheDocument();
  });

  it("affiche le pays", () => {
    render(<PersonHero person={mockPerson} />);
    expect(screen.getByText("États-Unis")).toBeInTheDocument();
  });

  it("affiche la bio", () => {
    render(<PersonHero person={mockPerson} />);
    expect(screen.getByText("Un acteur célèbre.")).toBeInTheDocument();
  });

  it("affiche le lien Wikipedia", () => {
    render(<PersonHero person={mockPerson} />);
    const link = screen.getByText("Voir la page Wikipedia");
    expect(link).toHaveAttribute(
      "href",
      "https://en.wikipedia.org/wiki/Leonardo_DiCaprio",
    );
  });

  it("n'affiche pas la date de naissance quand null", () => {
    render(<PersonHero person={mockPersonNoPhoto} />);
    expect(screen.queryByText(/Né\(e\) le/)).not.toBeInTheDocument();
  });

  it("n'affiche pas le lien Wikipedia quand wiki_url est null", () => {
    render(<PersonHero person={mockPersonNoPhoto} />);
    expect(
      screen.queryByText("Voir la page Wikipedia"),
    ).not.toBeInTheDocument();
  });
});

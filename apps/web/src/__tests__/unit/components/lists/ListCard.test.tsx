/**
 * Tests unitaires pour ListCard.
 * Phase 4.3 — Lists
 */

import { render, screen } from "@testing-library/react";
import { ListCard } from "@/components/lists/ListCard";
import { UserList } from "@/lib/types/api";

const mockList: UserList = {
  id: "1",
  nom: "Ma Watchlist",
  type: "watchlist",
  description: "Films à voir",
  items: [],
};

describe("ListCard", () => {
  it("affiche le nom de la liste", () => {
    render(<ListCard list={mockList} />);
    expect(screen.getByText("Ma Watchlist")).toBeInTheDocument();
  });

  it("affiche la description", () => {
    render(<ListCard list={mockList} />);
    expect(screen.getByText("Films à voir")).toBeInTheDocument();
  });

  it("affiche le type de liste", () => {
    render(<ListCard list={mockList} />);
    expect(screen.getByText("Watchlist")).toBeInTheDocument();
  });

  it("affiche le nombre d'items", () => {
    const listWithItems = {
      ...mockList,
      items: [{ id: "1", titre: "Inception" } as any],
    };
    render(<ListCard list={listWithItems} />);
    expect(screen.getByText("1 titre")).toBeInTheDocument();
  });

  it("indique avec combien de personnes la liste est partagée", () => {
    render(<ListCard list={{ ...mockList, _count: { list_items: 0, list_shares: 2 } }} />);
    expect(screen.getByText("Partagée avec 2")).toBeInTheDocument();
  });

  it("n'affiche pas d'indicateur de partage sans membre", () => {
    render(<ListCard list={mockList} />);
    expect(screen.queryByText(/Partagée avec/)).not.toBeInTheDocument();
  });

  it("redirige vers /lists/:id", () => {
    render(<ListCard list={mockList} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/lists/1");
  });
});

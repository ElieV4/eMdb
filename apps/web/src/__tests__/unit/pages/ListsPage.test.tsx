/**
 * Tests unitaires pour la page /lists.
 * Bug #11 — Vérifie que la page existe et affiche les listes de l'utilisateur.
 */

jest.mock("@/store/authStore", () => ({
  useAuthStore: () => ({
    user: { pseudo: "TestUser" },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

jest.mock("@/hooks/api/useLists", () => ({
  useLists: () => ({
    data: [
      {
        id: "1",
        nom: "Ma watchlist",
        type: "watchlist",
        description: "Films à voir",
        items: [],
      },
      {
        id: "2",
        nom: "Favoris",
        type: "favoris",
        description: null,
        items: [],
      },
    ],
    isLoading: false,
    error: null,
  }),
}));

jest.mock("@/components/lists/ListDialog", () => ({
  ListDialog: () => <div data-testid="list-dialog" />,
}));

import { render, screen } from "@testing-library/react";
import ListsPage from "@/app/lists/page";

describe("ListsPage", () => {
  it("affiche le titre Mes Listes", () => {
    render(<ListsPage />);
    expect(screen.getByText("Mes Listes")).toBeInTheDocument();
  });

  it("affiche les listes de l'utilisateur", () => {
    render(<ListsPage />);
    expect(screen.getByText("Ma watchlist")).toBeInTheDocument();
    const favorisElements = screen.getAllByText("Favoris");
    expect(favorisElements.length).toBeGreaterThan(0);
  });

  it("affiche le composant ListDialog", () => {
    render(<ListsPage />);
    expect(screen.getByTestId("list-dialog")).toBeInTheDocument();
  });
});

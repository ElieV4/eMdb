/**
 * Tests unitaires pour ListShareDialog : mode de partage, membres, ajout.
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { ListShareDialog } from "@/components/lists/ListShareDialog";

const shareMutate = jest.fn();
const removeMutate = jest.fn();
const modeMutate = jest.fn();

let members: Array<{
  list_id: string;
  shared_with_user_id: string;
  shared_at: string;
  users: { id: string; pseudo: string; avatar_url: null };
}> = [];
let searchResults: Array<{ id: string; pseudo: string; avatar_url: null }> = [];

jest.mock("@/hooks/api/useShareList", () => ({
  useShareList: () => ({ mutate: shareMutate, isPending: false }),
}));
jest.mock("@/hooks/api/useRemoveShare", () => ({
  useRemoveShare: () => ({ mutate: removeMutate, isPending: false }),
}));
jest.mock("@/hooks/api/useUpdateShareMode", () => ({
  useUpdateShareMode: () => ({ mutate: modeMutate, isPending: false }),
}));
jest.mock("@/hooks/api/useShares", () => ({
  useShares: () => ({ data: members, isLoading: false }),
}));
jest.mock("@/hooks/api/useSearchUsers", () => ({
  useSearchUsers: () => ({ data: searchResults, isFetching: false }),
}));
// Pas d'attente du debounce dans les tests.
jest.mock("@/hooks/ui", () => ({ useDebounce: (value: unknown) => value }));

const list = { id: "l1", nom: "Ciné-club", share_mode: "lecture" as const };

function renderDialog() {
  render(<ListShareDialog open onOpenChange={jest.fn()} list={list} />);
}

describe("ListShareDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    members = [];
    searchResults = [];
  });

  it("coche le mode actuel et change de mode au clic", () => {
    renderDialog();

    expect(screen.getByRole("radio", { name: /Lecture/ })).toHaveAttribute("aria-checked", "true");

    fireEvent.click(screen.getByRole("radio", { name: /Ouvert/ }));

    expect(modeMutate).toHaveBeenCalledWith(
      { listId: "l1", shareMode: "ouvert" },
      expect.any(Object),
    );
  });

  it("ne renvoie pas le mode déjà actif", () => {
    renderDialog();

    fireEvent.click(screen.getByRole("radio", { name: /Lecture/ }));

    expect(modeMutate).not.toHaveBeenCalled();
  });

  it("indique quand la liste n'est partagée avec personne", () => {
    renderDialog();

    expect(screen.getByText(/partagée avec personne/)).toBeInTheDocument();
  });

  it("retire un membre", () => {
    members = [
      {
        list_id: "l1",
        shared_with_user_id: "u2",
        shared_at: "2026-11-16T00:00:00Z",
        users: { id: "u2", pseudo: "marie", avatar_url: null },
      },
    ];
    renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Retirer marie" }));

    expect(removeMutate).toHaveBeenCalledWith({ listId: "l1", userId: "u2" }, expect.any(Object));
  });

  it("ajoute un membre trouvé par la recherche, sans reproposer les membres existants", () => {
    members = [
      {
        list_id: "l1",
        shared_with_user_id: "u2",
        shared_at: "2026-11-16T00:00:00Z",
        users: { id: "u2", pseudo: "marie", avatar_url: null },
      },
    ];
    searchResults = [
      { id: "u2", pseudo: "marie", avatar_url: null },
      { id: "u3", pseudo: "marc", avatar_url: null },
    ];
    renderDialog();

    fireEvent.change(screen.getByLabelText("Ajouter un membre"), { target: { value: "mar" } });

    // "marie" n'apparaît que dans la liste des membres, pas dans les résultats.
    expect(screen.getAllByText("marie")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: /marc/ }));

    expect(shareMutate).toHaveBeenCalledWith(
      { listId: "l1", data: { shared_with_user_id: "u3" } },
      expect.any(Object),
    );
  });
});

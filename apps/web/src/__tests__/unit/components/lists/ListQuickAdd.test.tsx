/**
 * Tests unitaires pour ListQuickAdd : recherche, ajout direct d'un titre
 * local, import puis ajout d'un titre TMDB, titres déjà dans la liste.
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ListQuickAdd } from "@/components/lists/ListQuickAdd";
import { TitleSearchResult } from "@/lib/types/api";

const addListItem = jest.fn();
const getOrImportTitle = jest.fn();
let searchResults: TitleSearchResult[] | undefined;

jest.mock("@/hooks/api/useSearch", () => ({
  useDebouncedTitleSearch: (query: string) => ({
    data: query.trim().length >= 2 ? searchResults : undefined,
    isFetching: false,
    isDebouncing: false,
    debouncedQuery: query.trim(),
  }),
}));
jest.mock("@/hooks/api/useAddListItem", () => ({
  useAddListItem: () => ({ mutateAsync: addListItem }),
}));
jest.mock("@/hooks/api/useGetOrImportTitle", () => ({
  useGetOrImportTitle: () => ({ mutateAsync: getOrImportTitle }),
}));
jest.mock("@/components/titles/TitlePoster", () => ({
  TitlePoster: ({ alt }: { alt: string }) => <div data-testid="poster">{alt}</div>,
}));

const local = (id: string, titre: string): TitleSearchResult => ({
  id,
  tmdbId: 1,
  titre,
  type: "film",
  local: true,
});

function renderModule(existing: string[] = []) {
  render(<ListQuickAdd listId="list-1" existingTitleIds={new Set(existing)} />);
}

const search = (value: string) =>
  fireEvent.change(screen.getByLabelText("Rechercher un titre à ajouter"), { target: { value } });

describe("ListQuickAdd", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    addListItem.mockResolvedValue({});
    searchResults = [];
  });

  it("invite à taper tant que la recherche est trop courte", () => {
    renderModule();
    search("a");
    expect(screen.getByText(/Tapez au moins 2 caractères/)).toBeInTheDocument();
  });

  it("affiche les résultats sur une ligne et ajoute un titre local", async () => {
    searchResults = [local("t1", "Match Point"), local("t2", "Annie Hall")];
    renderModule();
    search("allen");

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Ajouter Annie Hall à la liste" }));

    await waitFor(() =>
      expect(addListItem).toHaveBeenCalledWith({ listId: "list-1", titleId: "t2" }),
    );
    expect(getOrImportTitle).not.toHaveBeenCalled();
    expect(await screen.findByRole("button", { name: "Annie Hall est dans la liste" })).toBeDisabled();
  });

  it("importe un titre TMDB avant de l'ajouter", async () => {
    searchResults = [{ id: "550", tmdbId: 550, titre: "Fight Club", type: "film", local: false }];
    getOrImportTitle.mockResolvedValue({ id: "uuid-550" });
    renderModule();
    search("fight");

    fireEvent.click(screen.getByRole("button", { name: "Ajouter Fight Club à la liste" }));

    await waitFor(() =>
      expect(addListItem).toHaveBeenCalledWith({ listId: "list-1", titleId: "uuid-550" }),
    );
    expect(getOrImportTitle).toHaveBeenCalledWith({ tmdbId: 550, type: "film" });
  });

  it("signale les titres déjà dans la liste", () => {
    searchResults = [local("t1", "Match Point")];
    renderModule(["t1"]);
    search("match");

    expect(screen.getByRole("button", { name: "Match Point est dans la liste" })).toBeDisabled();
    expect(screen.getByText(/Dans la liste/)).toBeInTheDocument();
  });

  it("affiche une erreur si l'ajout échoue", async () => {
    searchResults = [local("t1", "Match Point")];
    addListItem.mockRejectedValue(new Error("403"));
    renderModule();
    search("match");

    fireEvent.click(screen.getByRole("button", { name: "Ajouter Match Point à la liste" }));

    expect(await screen.findByText(/Impossible d'ajouter « Match Point »/)).toBeInTheDocument();
  });

  it("indique quand rien n'est trouvé", () => {
    searchResults = [];
    renderModule();
    search("zzzz");
    expect(screen.getByText(/Aucun titre trouvé pour « zzzz »/)).toBeInTheDocument();
  });
});

describe("searchItems", () => {
  // La vraie réponse de /titles/search est { items, total } : c'est ce qui
  // manquait (le module n'affichait jamais aucun résultat en production).
  const { searchItems } = jest.requireActual("@/hooks/api/useSearch");

  it("lit la réponse paginée { items, total } de l'API", () => {
    expect(searchItems({ items: [{ tmdb_id: 116 }], total: 1 })).toEqual([{ tmdb_id: 116 }]);
  });

  it("accepte aussi un tableau nu", () => {
    expect(searchItems([{ tmdb_id: 116 }])).toEqual([{ tmdb_id: 116 }]);
  });
});

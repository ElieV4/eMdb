/**
 * Tests unitaires : vue tableau générique des pages de titres, barre
 * d'outils (recherche, vue), logique de tri / filtre / recherche.
 */

import { render, screen, fireEvent, within } from "@testing-library/react";
import { TitlesTable } from "@/components/titles/TitlesTable";
import { TitlesToolbar } from "@/components/titles/TitlesToolbar";
import { ViewModeToggle } from "@/components/titles/ViewModeToggle";
import { matchesColumnFilter, nextSort, releaseYear, rowMatchesSearch, sortRows } from "@/lib/titlesTable";
import { TitleSearchResult } from "@/lib/types/api";

jest.mock("@/components/titles/TitleQuickActionsMenu", () => ({
  TitleQuickActionsMenu: () => <button type="button">Actions rapides</button>,
}));
jest.mock("@/components/titles/TitlePoster", () => ({
  TitlePoster: () => <span data-testid="poster" />,
}));
const ID_A = "11111111-1111-1111-1111-111111111111";
const ID_B = "22222222-2222-2222-2222-222222222222";
const ID_C = "33333333-3333-3333-3333-333333333333";
jest.mock("@/hooks/api/useTitlesTableInfo", () => ({
  useTitlesTableInfo: () => ({
    data: {
      "11111111-1111-1111-1111-111111111111": {
        realisateurs: [{ id: "p1", nom: "Woody Allen" }],
        notePerso: 8,
        duree: 124,
        nombreEpisodes: null,
        dateSortie: null,
      },
      "22222222-2222-2222-2222-222222222222": {
        realisateurs: [{ id: "p1", nom: "Woody Allen" }],
        notePerso: 9,
        duree: 93,
        nombreEpisodes: null,
        dateSortie: null,
      },
    },
  }),
}));

const titles: TitleSearchResult[] = [
  { id: ID_A, titre: "Match Point", type: "film", dateSortie: "2005-10-26", note: 7.6, local: true },
  { id: ID_B, titre: "Annie Hall", type: "film", dateSortie: "1977-04-20", note: 8, local: true },
  { id: ID_C, titre: "The Office", type: "serie", dateSortie: "2005-03-24", nombreEpisodes: 201, local: true },
];

const bodyTitles = () =>
  within(screen.getAllByRole("rowgroup")[1])
    .getAllByRole("link")
    .map((a) => a.textContent)
    .filter(Boolean);

beforeEach(() => window.localStorage.clear());

describe("TitlesTable", () => {
  it("colonnes par défaut : affiche, titre, réalisation, sortie, durée, ma note, actions", () => {
    render(<TitlesTable titles={titles} pageKey="test" />);

    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent?.trim());
    expect(headers).toEqual(["Affiche", "Titre", "Réalisation", "Sortie", "Durée / épisodes", "Ma note", "Actions"]);
    expect(screen.getAllByText("Woody Allen")).toHaveLength(2);
    expect(screen.getByText("201 ép.")).toBeInTheDocument();
    expect(screen.getByText("2h 04 min")).toBeInTheDocument();
  });

  it("trie au clic sur l'en-tête, valeurs absentes en fin", () => {
    render(<TitlesTable titles={titles} pageKey="test" />);

    fireEvent.click(screen.getByRole("button", { name: "Trier par Ma note" }));
    expect(bodyTitles()).toEqual(["Match Point", "Annie Hall", "The Office"]);
    fireEvent.click(screen.getByRole("button", { name: "Trier par Ma note" }));
    expect(bodyTitles()).toEqual(["Annie Hall", "Match Point", "The Office"]);
  });

  it("recherche globale, y compris sur la réalisation", () => {
    render(<TitlesTable titles={titles} pageKey="test" search="allen" />);
    expect(bodyTitles()).toEqual(["Match Point", "Annie Hall"]);
  });

  it("filtres par colonne via Trier / filtrer", () => {
    render(<TitlesTable titles={titles} pageKey="test" filtersOpen />);

    fireEvent.change(screen.getByLabelText("Filtrer Ma note"), { target: { value: "9" } });
    expect(bodyTitles()).toEqual(["Annie Hall"]);
  });

  it("Colonnes : ajoute une colonne et mémorise le choix par page", () => {
    const { unmount } = render(<TitlesTable titles={titles} pageKey="test" columnsOpen />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Note IMDb" }));
    expect(screen.getAllByRole("columnheader").map((h) => h.textContent?.trim())).toContain("Note IMDb");
    unmount();

    render(<TitlesTable titles={titles} pageKey="test" />);
    expect(screen.getAllByRole("columnheader").map((h) => h.textContent?.trim())).toContain("Note IMDb");
  });

  it("colonnes propres à la page", () => {
    render(
      <TitlesTable
        titles={titles}
        pageKey="test"
        extraColumns={[{ id: "prochain", label: "Prochain épisode", render: (t) => `next-${t.titre}` }]}
      />,
    );
    expect(screen.getByText("next-The Office")).toBeInTheDocument();
  });
});

describe("TitlesToolbar", () => {
  it("recherche à gauche, vue et actions à droite ; boutons de tableau seulement en vue tableau", () => {
    const onSearch = jest.fn();
    const { rerender } = render(
      <TitlesToolbar search="" onSearchChange={onSearch} viewMode="affiches" onViewModeChange={jest.fn()} />,
    );
    expect(screen.queryByRole("button", { name: "Trier / filtrer" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Rechercher" }));
    fireEvent.change(screen.getByLabelText("Rechercher dans la page"), { target: { value: "allen" } });
    expect(onSearch).toHaveBeenCalledWith("allen");

    rerender(
      <TitlesToolbar
        search="allen"
        onSearchChange={onSearch}
        viewMode="tableau"
        onViewModeChange={jest.fn()}
        tableControls={{ filtersOpen: false, onToggleFilters: jest.fn(), columnsOpen: false, onToggleColumns: jest.fn() }}
      />,
    );
    expect(screen.getByRole("button", { name: "Trier / filtrer" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Colonnes" })).toBeInTheDocument();
  });
});

describe("ViewModeToggle", () => {
  it("icônes seules, libellé en aria-label", () => {
    const onChange = jest.fn();
    render(<ViewModeToggle mode="affiches" onChange={onChange} />);

    const table = screen.getByRole("button", { name: "Vue tableau" });
    expect(table.textContent).toBe("");
    expect(screen.getByRole("button", { name: "Vue affiches" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(table);
    expect(onChange).toHaveBeenCalledWith("tableau");
  });
});

describe("titlesTable (logique)", () => {
  it("cycle de tri : croissant, décroissant, aucun", () => {
    expect(nextSort(null, "titre")).toEqual({ column: "titre", direction: "asc" });
    expect(nextSort({ column: "titre", direction: "asc" }, "titre")).toEqual({ column: "titre", direction: "desc" });
    expect(nextSort({ column: "titre", direction: "desc" }, "titre")).toBeNull();
  });

  it("sans tri, garde l'ordre de la page", () => {
    expect(sortRows(titles, null, () => null)).toBe(titles);
  });

  it("recherche sans casse ni accents", () => {
    expect(rowMatchesSearch({ title: { ...titles[0], titre: "Amélie" } }, "AMELIE")).toBe(true);
    expect(rowMatchesSearch({ title: titles[0] }, "zzz")).toBe(false);
  });

  it("filtre numérique : minimum ; filtre texte : contient", () => {
    expect(matchesColumnFilter(8, "8", "number", "7")).toBe(true);
    expect(matchesColumnFilter(null, "", "number", "7")).toBe(false);
    expect(matchesColumnFilter("x", "Woody Allen", "text", "allen")).toBe(true);
  });

  it("année de sortie absente ou invalide", () => {
    expect(releaseYear({ ...titles[0], dateSortie: undefined })).toBeNull();
    expect(releaseYear({ ...titles[0], dateSortie: "n'importe quoi" })).toBeNull();
  });
});

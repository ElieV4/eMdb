/**
 * Tests unitaires : vue tableau générique des pages de titres, barre
 * d'outils (recherche, vue), logique de tri / filtre / recherche.
 */

import {
  render,
  screen,
  fireEvent,
  within,
  renderHook,
  act,
} from "@testing-library/react";
import { useTitleSortFilter } from "@/hooks/useTitleSortFilter";
import { TitlesTable } from "@/components/titles/TitlesTable";
import { TitlesToolbar } from "@/components/titles/TitlesToolbar";
import { ViewModeToggle } from "@/components/titles/ViewModeToggle";
import {
  nextSort,
  releaseYear,
  rowMatchesSearch,
  sortRows,
} from "@/lib/titlesTable";
import { matchesFilter, rangeBounds, setOptions } from "@/lib/columnFilters";
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
        titreVf: "Match Point (VF)",
        genres: ["Drame", "Thriller"],
        pays: [{ code: "GB", nom: "Royaume-Uni" }],
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
jest.mock("@/hooks/api/useTitleEmotions", () => ({
  useTitleEmotions: () => ({
    data: { "11111111-1111-1111-1111-111111111111": ["peur", "choc"] },
  }),
}));
const upsertRating = jest.fn();
jest.mock("@/hooks/api/useUpsertRating", () => ({
  useUpsertRating: () => ({ mutate: upsertRating }),
}));

const titles: TitleSearchResult[] = [
  {
    id: ID_A,
    titre: "Match Point",
    type: "film",
    dateSortie: "2005-10-26",
    note: 7.6,
    local: true,
  },
  {
    id: ID_B,
    titre: "Annie Hall",
    type: "film",
    dateSortie: "1977-04-20",
    note: 8,
    local: true,
  },
  {
    id: ID_C,
    titre: "The Office",
    type: "serie",
    dateSortie: "2005-03-24",
    nombreEpisodes: 201,
    local: true,
  },
];

const bodyTitles = () =>
  within(screen.getAllByRole("rowgroup")[1])
    .getAllByRole("link")
    .filter((a) => a.getAttribute("href")?.startsWith("/titles"))
    .map((a) => a.textContent)
    .filter(Boolean);

beforeEach(() => window.localStorage.clear());

describe("TitlesTable", () => {
  it("colonnes par défaut : affiche, titre, réalisation, sortie, durée, ma note, actions", () => {
    render(<TitlesTable titles={titles} pageKey="test" />);

    const headers = screen
      .getAllByRole("columnheader")
      .map((h) => h.textContent?.trim());
    expect(headers).toEqual([
      "Affiche",
      "Titre",
      "Réalisation",
      "Sortie",
      "Durée / épisodes",
      "Ma note",
      "Actions",
    ]);
    expect(screen.getAllByRole("link", { name: "Woody Allen" })).toHaveLength(
      2,
    );
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

  it("entonnoir d'en-tête : barre de recherche pour une colonne de texte", async () => {
    render(<TitlesTable titles={titles} pageKey="test" />);

    fireEvent.click(screen.getByRole("button", { name: "Filtrer Titre" }));
    fireEvent.change(await screen.findByLabelText("Rechercher dans Titre"), {
      target: { value: "annie" },
    });
    expect(bodyTitles()).toEqual(["Annie Hall"]);
    expect(
      screen.getByRole("button", { name: "Filtrer Titre (filtre actif)" }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /Effacer les filtres \(1\)/ }),
    );
    expect(bodyTitles()).toEqual(["Match Point", "Annie Hall", "The Office"]);
  });

  it("entonnoir d'en-tête : liste de cases pour le type, curseur pour les notes", async () => {
    render(<TitlesTable titles={titles} pageKey="test" columnsOpen />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Type" }));

    fireEvent.click(screen.getByRole("button", { name: "Filtrer Type" }));
    fireEvent.click(await screen.findByRole("checkbox", { name: /Série/ }));
    expect(bodyTitles()).toEqual(["The Office"]);

    fireEvent.click(screen.getByRole("button", { name: /^Filtrer Ma note/ }));
    expect(
      await screen.findByLabelText("Plage de Ma note"),
    ).toBeInTheDocument();
  });

  it("Colonnes : ajoute une colonne et mémorise le choix par page", () => {
    const { unmount } = render(
      <TitlesTable titles={titles} pageKey="test" columnsOpen />,
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "Note IMDb" }));
    expect(
      screen.getAllByRole("columnheader").map((h) => h.textContent?.trim()),
    ).toContain("Note IMDb");
    unmount();

    render(<TitlesTable titles={titles} pageKey="test" />);
    expect(
      screen.getAllByRole("columnheader").map((h) => h.textContent?.trim()),
    ).toContain("Note IMDb");
  });

  it("réalisateur cliquable, titre français en infobulle, note en badge suivie des émotions", () => {
    render(<TitlesTable titles={titles} pageKey="test" />);

    expect(
      screen
        .getAllByRole("link", { name: "Woody Allen" })[0]
        .getAttribute("href"),
    ).toMatch(/^\/people\/p1/);
    expect(screen.getByRole("link", { name: "Match Point" })).toHaveAttribute(
      "title",
      "Titre français : Match Point (VF)",
    );
    expect(
      screen.getByRole("button", { name: "Ma note pour Match Point : 8/10" }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Émotions : 😱 Peur, 🤯 Choc"),
    ).toHaveTextContent("😱🤯");
    // Pas encore noté : badge « Noter ».
    expect(
      screen.getByRole("button", { name: "Ma note pour The Office" }),
    ).toHaveTextContent("Noter");
  });

  it("colonnes ajoutables : genres, pays, émotions", () => {
    render(<TitlesTable titles={titles} pageKey="test" columnsOpen />);
    for (const name of ["Genres", "Pays", "Émotions"]) {
      fireEvent.click(screen.getByRole("checkbox", { name }));
    }
    expect(screen.getByText("Drame, Thriller")).toBeInTheDocument();
    expect(screen.getByText("Royaume-Uni")).toBeInTheDocument();
    // Dans « Ma note » (par défaut) et dans la colonne « Émotions ».
    expect(screen.getAllByTitle("😱 Peur, 🤯 Choc")).toHaveLength(2);
  });

  it("tri par l'en-tête, sans panneau de tri en vue tableau", () => {
    render(<TitlesTable titles={titles} pageKey="test" />);

    expect(screen.queryByLabelText("Trier par")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Trier par Titre" }));
    expect(bodyTitles()).toEqual(["Annie Hall", "Match Point", "The Office"]);
    fireEvent.click(screen.getByRole("button", { name: "Trier par Titre" }));
    expect(bodyTitles()).toEqual(["The Office", "Match Point", "Annie Hall"]);
  });

  it("modifier le contenu : colonne de cases à gauche, case « tout »", () => {
    const onToggle = jest.fn();
    const onSetAll = jest.fn();
    render(
      <TitlesTable
        titles={titles}
        pageKey="test"
        selection={{ selectedIds: new Set([ID_A]), onToggle, onSetAll }}
      />,
    );

    expect(screen.getAllByRole("columnheader")[0]).toContainElement(
      screen.getByRole("checkbox", { name: "Tout sélectionner" }),
    );
    expect(
      screen.getByRole("checkbox", { name: "Sélectionner Match Point" }),
    ).toBeChecked();
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Sélectionner Annie Hall" }),
    );
    expect(onToggle).toHaveBeenCalledWith(ID_B);
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Tout sélectionner" }),
    );
    expect(onSetAll).toHaveBeenCalledWith([ID_A, ID_B, ID_C], true);
  });

  it("affiche 100 lignes, puis la suite à la demande", () => {
    const many: TitleSearchResult[] = Array.from({ length: 150 }, (_, i) => ({
      id: `tmdb-${i}`,
      titre: `Titre ${i}`,
      type: "film",
      local: false,
      tmdbId: i,
    }));
    render(<TitlesTable titles={many} pageKey="test" />);

    expect(bodyTitles()).toHaveLength(100);
    fireEvent.click(
      screen.getByRole("button", {
        name: /Afficher plus \(100 lignes sur 150\)/,
      }),
    );
    expect(bodyTitles()).toHaveLength(150);
    expect(
      screen.queryByRole("button", { name: /Afficher plus/ }),
    ).not.toBeInTheDocument();
  });

  it("colonnes propres à la page", () => {
    render(
      <TitlesTable
        titles={titles}
        pageKey="test"
        extraColumns={[
          {
            id: "prochain",
            label: "Prochain épisode",
            render: (t) => `next-${t.titre}`,
          },
        ]}
      />,
    );
    expect(screen.getByText("next-The Office")).toBeInTheDocument();
  });
});

describe("TitlesToolbar", () => {
  it("recherche à gauche, vue et actions à droite ; boutons de tableau seulement en vue tableau", () => {
    const onSearch = jest.fn();
    const { rerender } = render(
      <TitlesToolbar
        search=""
        onSearchChange={onSearch}
        viewMode="affiches"
        onViewModeChange={jest.fn()}
      />,
    );
    // Sans `sortFilter`, pas de bouton.
    expect(
      screen.queryByRole("button", { name: "Trier / filtrer" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Rechercher" }));
    fireEvent.change(screen.getByLabelText("Rechercher dans la page"), {
      target: { value: "allen" },
    });
    expect(onSearch).toHaveBeenCalledWith("allen");

    rerender(
      <TitlesToolbar
        search="allen"
        onSearchChange={onSearch}
        viewMode="tableau"
        onViewModeChange={jest.fn()}
        sortFilter={{ open: false, onToggle: jest.fn() }}
        tableControls={{ columnsOpen: false, onToggleColumns: jest.fn() }}
      />,
    );
    // Vue tableau : « Colonnes » seulement, tri et filtres dans les en-têtes.
    expect(
      screen.queryByRole("button", { name: "Trier / filtrer" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Colonnes" }),
    ).toBeInTheDocument();

    rerender(
      <TitlesToolbar
        search="allen"
        onSearchChange={onSearch}
        viewMode="affiches"
        onViewModeChange={jest.fn()}
        sortFilter={{ open: false, onToggle: jest.fn(), activeCount: 2 }}
      />,
    );
    // Vue affiches : « Trier / filtrer », avec le nombre de tris / filtres actifs.
    expect(
      screen.getByRole("button", { name: "Trier / filtrer" }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("2 tri(s) ou filtre(s) actif(s)"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Colonnes" }),
    ).not.toBeInTheDocument();
  });
});

describe("ViewModeToggle", () => {
  it("icônes seules, libellé en aria-label", () => {
    const onChange = jest.fn();
    render(<ViewModeToggle mode="affiches" onChange={onChange} />);

    const table = screen.getByRole("button", { name: "Vue tableau" });
    expect(table.textContent).toBe("");
    expect(
      screen.getByRole("button", { name: "Vue affiches" }),
    ).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(table);
    expect(onChange).toHaveBeenCalledWith("tableau");
  });
});

describe("titlesTable (logique)", () => {
  it("cycle de tri : croissant, décroissant, aucun", () => {
    expect(nextSort(null, "titre")).toEqual({
      column: "titre",
      direction: "asc",
    });
    expect(nextSort({ column: "titre", direction: "asc" }, "titre")).toEqual({
      column: "titre",
      direction: "desc",
    });
    expect(
      nextSort({ column: "titre", direction: "desc" }, "titre"),
    ).toBeNull();
  });

  it("sans tri, garde l'ordre de la page", () => {
    expect(sortRows(titles, null, () => null)).toBe(titles);
  });

  it("recherche sans casse ni accents", () => {
    expect(
      rowMatchesSearch({ title: { ...titles[0], titre: "Amélie" } }, "AMELIE"),
    ).toBe(true);
    expect(rowMatchesSearch({ title: titles[0] }, "zzz")).toBe(false);
  });

  it("filtres : texte (contient), plage (bornes incluses), liste (une des valeurs)", () => {
    const get = {
      text: (n: number) => `Note ${n}`,
      number: (n: number) => n,
      set: (n: number) => [n > 5 ? "haut" : "bas"],
    };
    expect(matchesFilter(8, { kind: "text", value: "NOTE 8" }, get)).toBe(true);
    expect(matchesFilter(8, { kind: "range", min: 7, max: 8 }, get)).toBe(true);
    expect(matchesFilter(9, { kind: "range", min: 7, max: 8 }, get)).toBe(
      false,
    );
    expect(matchesFilter(3, { kind: "set", values: ["haut"] }, get)).toBe(
      false,
    );
    expect(rangeBounds([3, 9, 5], (n) => n)).toEqual([3, 9]);
    expect(
      setOptions([["Drame"], ["Drame", "Comédie"]], (g) => g).map((o) => [
        o.value,
        o.count,
      ]),
    ).toEqual([
      ["Drame", 2],
      ["Comédie", 1],
    ]);
  });

  it("année de sortie absente ou invalide", () => {
    expect(releaseYear({ ...titles[0], dateSortie: undefined })).toBeNull();
    expect(
      releaseYear({ ...titles[0], dateSortie: "n'importe quoi" }),
    ).toBeNull();
  });
});

describe("useTitleSortFilter (vue affiches)", () => {
  it("filtre et réordonne les cartes ; sans tri ni filtre, ordre de la page", () => {
    const { result } = renderHook(() => useTitleSortFilter(titles, true));
    expect(result.current.apply(titles, (t) => t.id)).toBe(titles);

    act(() =>
      result.current.setFilter("type", { kind: "set", values: ["Film"] }),
    );
    act(() => result.current.setSort({ column: "titre", direction: "asc" }));
    expect(result.current.activeCount).toBe(2);
    expect(
      result.current.apply(titles, (t) => t.id).map((t) => t.titre),
    ).toEqual(["Annie Hall", "Match Point"]);

    act(() => result.current.reset());
    expect(result.current.apply(titles, (t) => t.id)).toBe(titles);
  });
});

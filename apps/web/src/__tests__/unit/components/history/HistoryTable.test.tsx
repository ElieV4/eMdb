/**
 * Tests unitaires pour HistoryTable : affichage, tri, colonnes masquables,
 * édition sur place.
 */

import { render, screen, fireEvent, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HistoryTable } from "@/components/history/HistoryTable";
import { HistoryTableRow } from "@/lib/historyTable";

const updateWatch = jest.fn();
const upsertRating = jest.fn();

const row = (overrides: Partial<HistoryTableRow>): HistoryTableRow => ({
  watchId: "w1",
  dateVue: "2026-11-10T20:00:00Z",
  title: { id: "t1", titre: "Match Point", titreVo: "Match Point", type: "film", afficheUrl: null },
  episode: null,
  dateSortie: "2005-10-26",
  genres: ["Drame"],
  studios: [],
  realisateurs: [{ id: "p", nom: "Woody Allen" }],
  noteImdb: 7.6,
  moyenneApp: 7.3,
  nombreNotesApp: 4,
  notePerso: 8,
  commentaire: "Glaçant",
  titreNotePerso: 8,
  titreCommentaire: "Glaçant",
  support: "cinema",
  compagnie: "seul",
  emotion: ["tendu"],
  listes: [{ id: "l1", nom: "Ciné-club", type: "custom" }],
  ...overrides,
});

jest.mock("@/hooks/api/useHistoryTable", () => ({
  HISTORY_TABLE_KEY: ["history-table"],
  useHistoryTable: () => ({
    data: {
      truncated: false,
      rows: [
        row({}),
        row({
          watchId: "w2",
          dateVue: "2026-11-12T20:00:00Z",
          title: { id: "t2", titre: "Annie Hall", titreVo: "Annie Hall", type: "film", afficheUrl: null },
          notePerso: 6,
          commentaire: null,
          support: null,
        }),
      ],
    },
    isLoading: false,
    error: null,
  }),
  useUpdateWatch: () => ({ mutate: updateWatch }),
}));
jest.mock("@/hooks/api/useUpsertRating", () => ({
  useUpsertRating: () => ({ mutate: upsertRating, isPending: false }),
}));
jest.mock("@/hooks/api/useDeleteWatch", () => ({ useDeleteWatch: () => ({ mutate: jest.fn() }) }));
jest.mock("@/hooks/api/useAddListItem", () => ({ useAddListItem: () => ({ mutate: jest.fn() }) }));
jest.mock("@/hooks/api/useRemoveListItem", () => ({ useRemoveListItem: () => ({ mutate: jest.fn() }) }));
jest.mock("@/hooks/api/useLists", () => ({ useLists: () => ({ data: [] }) }));
jest.mock("@/hooks/api/useSharedLists", () => ({ useSharedLists: () => ({ data: [] }) }));

function renderTable(props: { search?: string; filtersOpen?: boolean } = {}) {
  const client = new QueryClient();
  render(
    <QueryClientProvider client={client}>
      <HistoryTable filtersOpen {...props} />
    </QueryClientProvider>,
  );
}

const bodyTitles = () =>
  within(screen.getAllByRole("rowgroup")[1])
    .getAllByRole("link")
    .filter((a) => !a.getAttribute("href")?.startsWith("/people"))
    .map((a) => a.textContent);

describe("HistoryTable", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    // Toutes les colonnes visibles pour les tests d'édition et de filtre ;
    // les colonnes par défaut ont leur propre test plus bas.
    window.localStorage.setItem("emdb.historyTable.hiddenColumns.v2", "[]");
  });

  it("affiche une ligne par visionnage avec les colonnes principales", () => {
    renderTable();

    expect(bodyTitles()).toEqual(["Match Point", "Annie Hall"]);
    const directors = screen.getAllByRole("link", { name: "Woody Allen" });
    expect(directors).toHaveLength(2);
    expect(directors[0].getAttribute("href")).toMatch(/^\/people\//);
    expect(screen.getAllByText("7.3")).toHaveLength(2);
  });

  it("trie au clic sur l'en-tête", () => {
    renderTable();

    fireEvent.click(screen.getByRole("button", { name: /^Titre/ }));
    expect(bodyTitles()).toEqual(["Annie Hall", "Match Point"]);

    fireEvent.click(screen.getByRole("button", { name: /^Titre/ }));
    expect(bodyTitles()).toEqual(["Match Point", "Annie Hall"]);
  });

  it("filtre par colonne", () => {
    renderTable();

    fireEvent.change(screen.getByLabelText("Filtrer Commentaire"), { target: { value: "glacant" } });

    expect(bodyTitles()).toEqual(["Match Point"]);
    expect(screen.getByText(/Effacer les filtres/)).toBeInTheDocument();
  });

  it("modifie la note et le support sur place", () => {
    renderTable();

    fireEvent.click(screen.getByRole("button", { name: /^Ma note pour Annie Hall/ }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: "9/10" }));
    expect(upsertRating).toHaveBeenCalledWith({ title_id: "t2", note_perso: 9 }, expect.any(Object));

    fireEvent.change(screen.getByLabelText("Support pour Annie Hall"), { target: { value: "tv" } });
    expect(updateWatch).toHaveBeenCalledWith({ watchId: "w2", patch: { support: "tv" } }, expect.any(Object));
  });

  it("enregistre le commentaire depuis le dialogue", () => {
    renderTable();

    fireEvent.click(screen.getByRole("button", { name: "Modifier le commentaire pour Annie Hall" }));
    fireEvent.change(screen.getByLabelText("Commentaire"), { target: { value: "Drôle" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(upsertRating).toHaveBeenCalledWith({ title_id: "t2", commentaire: "Drôle" }, expect.any(Object));
  });

  it("colonnes par défaut : affiche, titre, réalisation, sortie, vu le, durée, ma note", () => {
    window.localStorage.clear();
    renderTable();

    const headers = screen
      .getAllByRole("columnheader")
      .map((h) => h.textContent?.trim())
      .filter(Boolean);
    expect(headers).toEqual(
      expect.arrayContaining(["Affiche", "Titre", "Réalisation", "Sortie", "Vu le", "Durée", "Ma note"]),
    );
    for (const hidden of ["Studios", "Compagnie", "Support", "Commentaire", "Moyenne eMDB"]) {
      expect(headers).not.toContain(hidden);
    }
  });

  it("recherche globale sur toutes les colonnes", () => {
    renderTable({ search: "allen" });
    expect(bodyTitles()).toEqual(["Match Point", "Annie Hall"]);
  });

  it("filtres par colonne masqués tant que Trier / filtrer est fermé", () => {
    renderTable({ filtersOpen: false });
    expect(screen.queryByLabelText("Filtrer Commentaire")).not.toBeInTheDocument();
  });
});

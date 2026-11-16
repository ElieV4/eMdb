/**
 * Tests unitaires de la logique de la vue tableau de l'historique.
 */

import {
  HistoryTableRow,
  matchesFilters,
  nextSort,
  sortRows,
  toDisplayRows,
} from "@/lib/historyTable";

const base: HistoryTableRow = {
  watchId: "w",
  dateVue: "2026-11-10T20:00:00Z",
  title: { id: "film", titre: "Match Point", titreVo: "Match Point", type: "film", afficheUrl: null },
  episode: null,
  dateSortie: "2005-10-26",
  genres: ["Drame"],
  studios: [],
  realisateurs: [{ id: "p", nom: "Woody Allen" }],
  noteImdb: 7.6,
  moyenneApp: null,
  nombreNotesApp: 0,
  notePerso: 8,
  commentaire: "Glaçant",
  titreNotePerso: 8,
  titreCommentaire: "Glaçant",
  support: "cinema",
  compagnie: "seul",
  emotion: ["tendu"],
  listes: [],
};

const episode = (id: string, date: string, extra: Partial<HistoryTableRow> = {}): HistoryTableRow => ({
  ...base,
  watchId: id,
  dateVue: date,
  title: { id: "office", titre: "The Office", titreVo: "The Office", type: "serie", afficheUrl: null },
  episode: { id: `ep-${id}`, saison: 1, numero: Number(id.slice(1)), titre: null },
  notePerso: null,
  commentaire: null,
  titreNotePerso: 9,
  titreCommentaire: "Culte",
  emotion: [],
  ...extra,
});

const rows: HistoryTableRow[] = [
  episode("e2", "2026-11-12T21:00:00Z", { support: "tv", emotion: ["content"] }),
  base,
  episode("e1", "2026-11-09T21:00:00Z", { support: "ordinateur" }),
];

describe("toDisplayRows", () => {
  it("par défaut : une ligne par visionnage", () => {
    expect(toDisplayRows(rows, false).map((r) => r.key)).toEqual(["e2", "w", "e1"]);
  });

  it("regroupé : une ligne par série à la place de son épisode le plus récent", () => {
    const grouped = toDisplayRows(rows, true);

    expect(grouped.map((r) => r.key)).toEqual(["serie:office", "w"]);
    expect(grouped[0]).toMatchObject({
      grouped: true,
      episodeCount: 2,
      dateVue: "2026-11-12T21:00:00Z",
      // Note et commentaire de la série elle-même.
      notePerso: 9,
      commentaire: "Culte",
      emotion: ["content"],
    });
  });
});

describe("matchesFilters", () => {
  const display = toDisplayRows(rows, false);

  it("filtre texte insensible à la casse et aux accents", () => {
    expect(display.filter((r) => matchesFilters(r, { commentaire: { kind: "text", value: "glacant" } }))).toHaveLength(1);
    expect(display.filter((r) => matchesFilters(r, { titre: { kind: "text", value: "s01e02" } }))).toHaveLength(1);
  });

  it("filtre numérique : note minimale, les lignes sans note sont exclues", () => {
    expect(display.filter((r) => matchesFilters(r, { notePerso: { kind: "number", min: 7 } })).map((r) => r.key)).toEqual(["w"]);
  });

  it("filtre enum : une des valeurs choisies", () => {
    const keys = display.filter((r) => matchesFilters(r, { support: { kind: "enum", values: ["tv", "cinema"] } })).map((r) => r.key);
    expect(keys).toEqual(["e2", "w"]);
  });

  it("filtre enum sur une série regroupée : support de n'importe lequel de ses épisodes", () => {
    const grouped = toDisplayRows(rows, true);
    expect(grouped.filter((r) => matchesFilters(r, { support: { kind: "enum", values: ["ordinateur"] } })).map((r) => r.key)).toEqual([
      "serie:office",
    ]);
  });
});

describe("sortRows / nextSort", () => {
  const display = toDisplayRows(rows, false);

  it("trie par note, valeurs absentes toujours en fin", () => {
    const withNotes = display.map((r) => (r.key === "e1" ? { ...r, notePerso: 5 } : r));
    expect(sortRows(withNotes, { column: "notePerso", direction: "asc" }).map((r) => r.key)).toEqual(["e1", "w", "e2"]);
    expect(sortRows(withNotes, { column: "notePerso", direction: "desc" }).map((r) => r.key)).toEqual(["w", "e1", "e2"]);
  });

  it("trie par date de visionnage", () => {
    expect(sortRows(display, { column: "dateVue", direction: "asc" }).map((r) => r.key)).toEqual(["e1", "w", "e2"]);
  });

  it("clic sur un en-tête : croissant, décroissant, puis sans tri", () => {
    const first = nextSort(null, "titre");
    const second = nextSort(first, "titre");
    expect(first).toEqual({ column: "titre", direction: "asc" });
    expect(second).toEqual({ column: "titre", direction: "desc" });
    expect(nextSort(second, "titre")).toBeNull();
    expect(nextSort(second, "dateVue")).toEqual({ column: "dateVue", direction: "asc" });
  });
});

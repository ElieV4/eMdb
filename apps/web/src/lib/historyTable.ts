/**
 * Vue tableau de l'historique : types, colonnes, tri, filtres et
 * regroupement par série. Logique pure (testée à part), le composant
 * HistoryTable ne fait que l'afficher.
 */

import {
  FilterValue,
  dayNumber,
  formatDay,
  matchesFilter,
  rangeBounds,
  setOptions,
} from "@/lib/columnFilters";
import type { FilterOption } from "@/lib/columnFilters";
import {
  WATCH_COMPAGNIE_OPTIONS,
  WATCH_EMOTION_OPTIONS,
  WATCH_SUPPORT_OPTIONS,
  compagnieLabel,
  emotionLabels,
  supportLabel,
} from "@/lib/watchContext";

const NOT_SET = { value: "", label: "Non renseigné" };

/** Ligne renvoyée par GET /watches/table (un visionnage). */
export type HistoryTableRow = {
  watchId: string;
  dateVue: string;
  title: {
    id: string;
    titre: string;
    titreVo: string;
    type: "film" | "serie";
    afficheUrl: string | null;
  } | null;
  episode: {
    id: string;
    saison: number;
    numero: number;
    titre: string | null;
  } | null;
  dateSortie: string | null;
  /** Durée en minutes (épisode pour un épisode, film sinon). */
  duree?: number | null;
  genres: string[];
  /** Pays de production (absent des réponses d'avant l'ajout de la colonne). */
  pays?: string[];
  studios: { id: string; nom: string }[];
  realisateurs: { id: string; nom: string }[];
  noteImdb: number | null;
  moyenneApp: number | null;
  nombreNotesApp: number;
  notePerso: number | null;
  commentaire: string | null;
  titreNotePerso: number | null;
  titreCommentaire: string | null;
  support: string | null;
  compagnie: string | null;
  emotion: string[];
  listes: { id: string; nom: string; type: string }[];
};

export type HistoryTableResponse = {
  truncated: boolean;
  rows: HistoryTableRow[];
};

/**
 * Ligne affichée : un visionnage, ou (regroupement par série) une série
 * entière avec ses épisodes vus.
 */
export type DisplayRow = HistoryTableRow & {
  key: string;
  /** Ligne de regroupement d'une série (non modifiable sauf note/commentaire/listes). */
  grouped: boolean;
  /** Nombre d'épisodes vus (regroupement). */
  episodeCount: number;
};

export type ColumnId =
  | "affiche"
  | "dateVue"
  | "titre"
  | "type"
  | "dateSortie"
  | "duree"
  | "genres"
  | "pays"
  | "studios"
  | "realisateurs"
  | "noteImdb"
  | "moyenneApp"
  | "notePerso"
  | "support"
  | "compagnie"
  | "emotion"
  | "commentaire"
  | "listes";

/**
 * Filtre d'une colonne (entonnoir de l'en-tête) : recherche (`text`),
 * curseur à deux bornes (`range`, valeur de `number`) ou liste de cases
 * (`set`, valeurs de `enumValues`) ; `none` : pas de filtre.
 */
export type FilterKind = "text" | "range" | "set" | "none";

export type ColumnDef = {
  id: ColumnId;
  label: string;
  filter: FilterKind;
  /** Valeur de tri (null = toujours en fin de liste). */
  sortValue: (row: DisplayRow) => string | number | null;
  /** Texte utilisé par le filtre texte / enum. */
  filterText: (row: DisplayRow) => string;
  /** Valeurs proposées par le filtre enum. */
  enumOptions?: { value: string; label: string }[];
  /** Valeurs (pour enum) portées par la ligne. */
  enumValues?: (row: DisplayRow) => string[];
  /** Filtre « plage » : valeur numérique, pas du curseur, format. */
  number?: (row: DisplayRow) => number | null;
  step?: number;
  format?: (n: number) => string;
};

const time = (iso: string | null) => (iso ? new Date(iso).getTime() : null);

const joinNoms = (items: { nom: string }[]) =>
  items.map((i) => i.nom).join(", ");

export function episodeCode(
  row: Pick<HistoryTableRow, "episode">,
): string | null {
  if (!row.episode) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `S${pad(row.episode.saison)}E${pad(row.episode.numero)}`;
}

export const COLUMNS: ColumnDef[] = [
  {
    id: "affiche",
    label: "Affiche",
    filter: "none",
    sortValue: () => null,
    filterText: () => "",
  },
  {
    id: "dateVue",
    label: "Vu le",
    filter: "range",
    number: (r) => dayNumber(r.dateVue),
    format: formatDay,
    sortValue: (r) => time(r.dateVue),
    filterText: (r) => new Date(r.dateVue).toLocaleDateString("fr-FR"),
  },
  {
    id: "titre",
    label: "Titre",
    filter: "text",
    sortValue: (r) => (r.title?.titre ?? "").toLocaleLowerCase("fr"),
    filterText: (r) =>
      [r.title?.titre, r.title?.titreVo, episodeCode(r), r.episode?.titre]
        .filter(Boolean)
        .join(" "),
  },
  {
    id: "type",
    label: "Type",
    filter: "set",
    sortValue: (r) => r.title?.type ?? null,
    filterText: (r) => r.title?.type ?? "",
    enumOptions: [
      { value: "film", label: "Film" },
      { value: "serie", label: "Série" },
    ],
    enumValues: (r) => (r.title ? [r.title.type] : []),
  },
  {
    id: "dateSortie",
    label: "Sortie",
    filter: "range",
    number: (r) => dayNumber(r.dateSortie),
    format: formatDay,
    sortValue: (r) => time(r.dateSortie),
    filterText: (r) =>
      r.dateSortie ? new Date(r.dateSortie).toLocaleDateString("fr-FR") : "",
  },
  {
    id: "duree",
    label: "Durée",
    filter: "range",
    number: (r) => r.duree ?? null,
    format: (n) => `${n} min`,
    sortValue: (r) => r.duree ?? null,
    filterText: (r) => (r.duree != null ? String(r.duree) : ""),
  },
  {
    id: "genres",
    label: "Genres",
    filter: "set",
    enumValues: (r) => r.genres,
    sortValue: (r) => r.genres.join(", ").toLocaleLowerCase("fr") || null,
    filterText: (r) => r.genres.join(", "),
  },
  {
    id: "pays",
    label: "Pays",
    filter: "set",
    enumValues: (r) => r.pays ?? [],
    sortValue: (r) => (r.pays ?? []).join(", ").toLocaleLowerCase("fr") || null,
    filterText: (r) => (r.pays ?? []).join(", "),
  },
  {
    id: "studios",
    label: "Studios",
    filter: "set",
    enumValues: (r) => r.studios.map((x) => x.nom),
    sortValue: (r) => joinNoms(r.studios).toLocaleLowerCase("fr") || null,
    filterText: (r) => joinNoms(r.studios),
  },
  {
    id: "realisateurs",
    label: "Réalisation",
    filter: "text",
    sortValue: (r) => joinNoms(r.realisateurs).toLocaleLowerCase("fr") || null,
    filterText: (r) => joinNoms(r.realisateurs),
  },
  {
    id: "noteImdb",
    label: "IMDb",
    filter: "range",
    number: (r) => r.noteImdb,
    step: 0.1,
    format: (n) => n.toFixed(1),
    sortValue: (r) => r.noteImdb,
    filterText: (r) => (r.noteImdb ?? "").toString(),
  },
  {
    id: "moyenneApp",
    label: "Moyenne eMDB",
    filter: "range",
    number: (r) => r.moyenneApp,
    step: 0.1,
    format: (n) => n.toFixed(1),
    sortValue: (r) => r.moyenneApp,
    filterText: (r) => (r.moyenneApp ?? "").toString(),
  },
  {
    id: "notePerso",
    label: "Ma note",
    filter: "range",
    number: (r) => r.notePerso,
    step: 0.5,
    sortValue: (r) => r.notePerso,
    filterText: (r) => (r.notePerso ?? "").toString(),
  },
  {
    id: "support",
    label: "Support",
    filter: "set",
    sortValue: (r) => supportLabel(r.support),
    filterText: (r) => supportLabel(r.support) ?? "",
    enumOptions: [
      ...WATCH_SUPPORT_OPTIONS.map(({ value, label }) => ({ value, label })),
      NOT_SET,
    ],
    enumValues: (r) =>
      r.grouped ? groupedValues(r, "support") : [r.support ?? ""],
  },
  {
    id: "compagnie",
    label: "Compagnie",
    filter: "set",
    sortValue: (r) => compagnieLabel(r.compagnie),
    filterText: (r) => compagnieLabel(r.compagnie) ?? "",
    enumOptions: [...WATCH_COMPAGNIE_OPTIONS, NOT_SET],
    enumValues: (r) =>
      r.grouped ? groupedValues(r, "compagnie") : [r.compagnie ?? ""],
  },
  {
    id: "emotion",
    label: "Émotions",
    filter: "set",
    sortValue: (r) => emotionLabels(r.emotion),
    filterText: (r) => emotionLabels(r.emotion) ?? "",
    enumOptions: WATCH_EMOTION_OPTIONS,
    enumValues: (r) => r.emotion,
  },
  {
    id: "commentaire",
    label: "Commentaire",
    filter: "text",
    sortValue: (r) => r.commentaire?.toLocaleLowerCase("fr") ?? null,
    filterText: (r) => r.commentaire ?? "",
  },
  {
    id: "listes",
    label: "Listes",
    filter: "set",
    enumValues: (r) => r.listes.map((l) => l.nom),
    sortValue: (r) => joinNoms(r.listes).toLocaleLowerCase("fr") || null,
    filterText: (r) => joinNoms(r.listes),
  },
];

/** Colonnes visibles par défaut. */
export const DEFAULT_VISIBLE_COLUMNS: ColumnId[] = [
  "affiche",
  "titre",
  "realisateurs",
  "dateSortie",
  "dateVue",
  "duree",
  "notePerso",
];

/** Ordre d'affichage des colonnes (les colonnes par défaut d'abord). */
export const COLUMN_ORDER: ColumnId[] = [
  ...DEFAULT_VISIBLE_COLUMNS,
  ...COLUMNS.map((c) => c.id).filter(
    (id) => !DEFAULT_VISIBLE_COLUMNS.includes(id),
  ),
];

/** Texte de toutes les colonnes d'une ligne (recherche globale). */
export function rowSearchText(row: DisplayRow): string {
  return COLUMNS.map((c) => c.filterText(row)).join(" ");
}

export const DEFAULT_HIDDEN_COLUMNS: ColumnId[] = COLUMNS.map(
  (c) => c.id,
).filter((id) => !DEFAULT_VISIBLE_COLUMNS.includes(id));

// --- Regroupement par série -------------------------------------------------

/** Valeurs distinctes de support/compagnie des épisodes d'une ligne regroupée. */
const groupedContext = new WeakMap<
  DisplayRow,
  { support: string[]; compagnie: string[] }
>();

function groupedValues(
  row: DisplayRow,
  key: "support" | "compagnie",
): string[] {
  return groupedContext.get(row)?.[key] ?? [];
}

export function toDisplayRows(
  rows: HistoryTableRow[],
  groupBySeries: boolean,
): DisplayRow[] {
  if (!groupBySeries) {
    return rows.map((r) => ({
      ...r,
      key: r.watchId,
      grouped: false,
      episodeCount: r.episode ? 1 : 0,
    }));
  }

  const result: DisplayRow[] = [];
  const series = new Map<string, HistoryTableRow[]>();
  for (const row of rows) {
    if (row.episode && row.title) {
      const key = row.title.id;
      if (!series.has(key)) {
        // Place de la série dans la liste : celle de son visionnage le plus
        // récent (les lignes arrivent du plus récent au plus ancien).
        series.set(key, []);
        result.push({
          ...row,
          key: `serie:${key}`,
          grouped: true,
          episodeCount: 0,
        });
      }
      series.get(key)!.push(row);
    } else {
      result.push({
        ...row,
        key: row.watchId,
        grouped: false,
        episodeCount: 0,
      });
    }
  }

  return result.map((row) => {
    if (!row.grouped || !row.title) return row;
    const episodes = series.get(row.title.id) ?? [];
    const distinct = (values: (string | null)[]) => [
      ...new Set(values.map((v) => v ?? "")),
    ];
    const grouped: DisplayRow = {
      ...row,
      episode: null,
      episodeCount: episodes.length,
      // Dernier visionnage (la première ligne est la plus récente).
      dateVue: episodes[0].dateVue,
      // Note et commentaire de la série elle-même.
      notePerso: row.titreNotePerso,
      commentaire: row.titreCommentaire,
      support: null,
      compagnie: null,
      emotion: [...new Set(episodes.flatMap((e) => e.emotion))],
      dateSortie: null,
    };
    groupedContext.set(grouped, {
      support: distinct(episodes.map((e) => e.support)),
      compagnie: distinct(episodes.map((e) => e.compagnie)),
    });
    return grouped;
  });
}

// --- Filtres et tri ---------------------------------------------------------

/** Filtre d'une colonne : texte (contient), plage (entre deux bornes), liste (une des valeurs). */
export type ColumnFilter = FilterValue;

export type SortState = { column: ColumnId; direction: "asc" | "desc" } | null;

export const normalize = (s: string) =>
  s.toLocaleLowerCase("fr").normalize("NFD").replace(/[̀-ͯ]/g, "");

export function matchesFilters(
  row: DisplayRow,
  filters: Partial<Record<ColumnId, ColumnFilter>>,
): boolean {
  for (const column of COLUMNS) {
    const filter = filters[column.id];
    if (!filter) continue;
    const ok = matchesFilter(row, filter, {
      text: column.filterText,
      number: column.number,
      set: column.enumValues,
    });
    if (!ok) return false;
  }
  return true;
}

/** Bornes (plage) ou valeurs proposées (liste) du filtre d'une colonne. */
export function columnFilterChoices(
  column: ColumnDef,
  rows: DisplayRow[],
): { bounds?: [number, number] | null; options?: FilterOption[] } {
  if (column.filter === "range" && column.number) {
    return { bounds: rangeBounds(rows, column.number) };
  }
  if (column.filter === "set" && column.enumValues) {
    const labels = new Map(
      (column.enumOptions ?? []).map((o) => [o.value, o.label]),
    );
    return {
      options: setOptions(
        rows,
        column.enumValues,
        (v) => labels.get(v) ?? (v || "Non renseigné"),
      ),
    };
  }
  return {};
}

export function sortRows(rows: DisplayRow[], sort: SortState): DisplayRow[] {
  if (!sort) return rows;
  const column = COLUMNS.find((c) => c.id === sort.column);
  if (!column) return rows;
  const factor = sort.direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const va = column.sortValue(a);
    const vb = column.sortValue(b);
    // Valeurs absentes toujours en fin, quel que soit le sens.
    if (va === null && vb === null) return 0;
    if (va === null) return 1;
    if (vb === null) return -1;
    if (typeof va === "number" && typeof vb === "number")
      return (va - vb) * factor;
    return String(va).localeCompare(String(vb), "fr") * factor;
  });
}

/** Clic sur un en-tête : croissant → décroissant → pas de tri. */
export function nextSort(current: SortState, column: ColumnId): SortState {
  if (!current || current.column !== column)
    return { column, direction: "asc" };
  if (current.direction === "asc") return { column, direction: "desc" };
  return null;
}

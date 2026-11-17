/**
 * Vue tableau de l'historique : une ligne par visionnage (ou par série si
 * regroupé), tri au clic sur l'en-tête, filtre par colonne, colonnes
 * masquables, et modification sur place de la note, du contexte
 * (support / compagnie / émotions), du commentaire, de la date, des listes,
 * ainsi que la suppression d'un visionnage.
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  MessageSquare,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  HISTORY_TABLE_KEY,
  useHistoryTable,
  useUpdateWatch,
  WatchPatch,
} from "@/hooks/api/useHistoryTable";
import { useUpsertRating } from "@/hooks/api/useUpsertRating";
import { useDeleteWatch } from "@/hooks/api/useDeleteWatch";
import { useAddListItem } from "@/hooks/api/useAddListItem";
import { useRemoveListItem } from "@/hooks/api/useRemoveListItem";
import { useLists } from "@/hooks/api/useLists";
import { useSharedLists } from "@/hooks/api/useSharedLists";
import {
  COLUMNS,
  ColumnDef,
  ColumnFilter,
  ColumnId,
  DEFAULT_HIDDEN_COLUMNS,
  COLUMN_ORDER,
  normalize,
  rowSearchText,
  DisplayRow,
  SortState,
  episodeCode,
  matchesFilters,
  nextSort,
  sortRows,
  toDisplayRows,
} from "@/lib/historyTable";
import {
  WATCH_COMPAGNIE_OPTIONS,
  WATCH_EMOTION_OPTIONS,
  WATCH_SUPPORT_OPTIONS,
  compagnieLabel,
  emotionLabels,
  supportLabel,
} from "@/lib/watchContext";
import { buildEntityUrl, cn } from "@/lib/utils";
import { TitlePoster } from "@/components/titles/TitlePoster";
import { formatDuration } from "@/lib/cardFormatting";

// v2 : nouvelles colonnes par défaut (titre, réalisation, sortie, ma note) —
// les choix enregistrés avec l'ancien jeu par défaut ne sont pas repris.
const HIDDEN_COLUMNS_STORAGE_KEY = "emdb.historyTable.hiddenColumns.v2";

function loadHiddenColumns(): ColumnId[] {
  try {
    const raw = window.localStorage.getItem(HIDDEN_COLUMNS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed))
      return parsed.filter((id) => COLUMNS.some((c) => c.id === id));
  } catch {
    // stockage indisponible : colonnes par défaut
  }
  return DEFAULT_HIDDEN_COLUMNS;
}

function saveHiddenColumns(ids: ColumnId[]) {
  try {
    window.localStorage.setItem(
      HIDDEN_COLUMNS_STORAGE_KEY,
      JSON.stringify(ids),
    );
  } catch {
    // préférence non persistée, sans conséquence
  }
}

const formatDate = (iso: string | null, withTime = false) =>
  iso
    ? new Date(iso).toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
      })
    : "—";

/** Valeur pour <input type="datetime-local"> en heure locale. */
function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const selectClass =
  "h-7 rounded-md border border-input bg-transparent px-1.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

type HistoryTableProps = {
  /** Recherche globale (barre d'outils de la page), sur toutes les colonnes. */
  search?: string;
  /** « Trier / filtrer » : ligne de filtres par colonne et options. */
  filtersOpen?: boolean;
  /** « Colonnes » : choix des colonnes visibles. */
  columnsOpen?: boolean;
};

export function HistoryTable({ search = "", filtersOpen = false, columnsOpen = false }: HistoryTableProps = {}) {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useHistoryTable();
  const { data: ownLists } = useLists();
  const { data: sharedLists } = useSharedLists();
  const updateWatch = useUpdateWatch();
  const upsertRating = useUpsertRating();
  const deleteWatch = useDeleteWatch();
  const addListItem = useAddListItem();
  const removeListItem = useRemoveListItem();

  const [groupBySeries, setGroupBySeries] = useState(false);
  const [sort, setSort] = useState<SortState>(null);
  const [filters, setFilters] = useState<
    Partial<Record<ColumnId, ColumnFilter>>
  >({});
  const [hidden, setHidden] = useState<ColumnId[]>(DEFAULT_HIDDEN_COLUMNS);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [commentRow, setCommentRow] = useState<DisplayRow | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [toDelete, setToDelete] = useState<DisplayRow | null>(null);
  const [actionError, setActionError] = useState("");

  useEffect(() => setHidden(loadHiddenColumns()), []);

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: HISTORY_TABLE_KEY });
  const onError = (err: unknown) =>
    setActionError(
      err instanceof Error
        ? err.message
        : "La modification n'a pas pu être enregistrée.",
    );

  const visibleColumns = COLUMN_ORDER.map((id) => COLUMNS.find((c) => c.id === id)!).filter(
    (c) => !hidden.includes(c.id),
  );
  const toggleColumn = (id: ColumnId) => {
    const next = hidden.includes(id)
      ? hidden.filter((h) => h !== id)
      : [...hidden, id];
    setHidden(next);
    saveHiddenColumns(next);
  };

  const rows = useMemo(() => {
    const display = toDisplayRows(data?.rows ?? [], groupBySeries);
    const query = normalize(search.trim());
    return sortRows(
      display.filter(
        (r) => matchesFilters(r, filters) && (!query || normalize(rowSearchText(r)).includes(query)),
      ),
      sort,
    );
  }, [data, groupBySeries, filters, sort, search]);

  // Listes dans lesquelles l'utilisateur peut ranger un titre : les siennes,
  // et les listes partagées avec lui en mode "ouvert".
  const editableLists = useMemo(
    () => [
      ...(ownLists ?? []).map((l) => ({ id: l.id, nom: l.nom })),
      ...(sharedLists ?? [])
        .filter((s) => s.capabilities.canAddItems)
        .map((s) => ({
          id: s.list.id,
          nom: `${s.list.nom} (${s.list.owner.pseudo})`,
        })),
    ],
    [ownLists, sharedLists],
  );

  // --- actions --------------------------------------------------------------

  /** Note et commentaire : ceux de l'épisode, sinon du titre (série regroupée comprise). */
  const ratingTarget = (row: DisplayRow) =>
    row.episode && !row.grouped
      ? { episode_id: row.episode.id }
      : { title_id: row.title?.id };

  const patchWatch = (row: DisplayRow, patch: WatchPatch) => {
    setActionError("");
    updateWatch.mutate({ watchId: row.watchId, patch }, { onError });
  };

  const setNote = (row: DisplayRow, note: number) => {
    setActionError("");
    upsertRating.mutate(
      { ...ratingTarget(row), note_perso: note },
      { onSuccess: refresh, onError },
    );
  };

  const saveComment = () => {
    if (!commentRow) return;
    setActionError("");
    upsertRating.mutate(
      { ...ratingTarget(commentRow), commentaire: commentDraft },
      {
        onSuccess: () => {
          refresh();
          setCommentRow(null);
        },
        onError,
      },
    );
  };

  const toggleList = (row: DisplayRow, listId: string, inList: boolean) => {
    if (!row.title) return;
    setActionError("");
    const vars = { listId, titleId: row.title.id };
    (inList ? removeListItem : addListItem).mutate(vars, {
      onSuccess: refresh,
      onError,
    });
  };

  const setFilter = (id: ColumnId, filter: ColumnFilter | null) =>
    setFilters((current) => {
      const next = { ...current };
      if (filter) next[id] = filter;
      else delete next[id];
      return next;
    });

  // --- rendu des cellules ---------------------------------------------------

  const renderCell = (column: ColumnDef, row: DisplayRow) => {
    switch (column.id) {
      case "affiche":
        return row.title ? (
          <TitlePoster
            src={row.title.afficheUrl}
            alt={row.title.titre}
            title={row.title.titre}
            type={row.title.type}
            width={32}
            height={48}
            className="[&>div]:hidden"
          />
        ) : null;
      case "duree":
        return row.duree != null ? formatDuration(row.duree) : "—";
      case "dateVue":
        if (row.grouped) {
          return (
            <span>
              {formatDate(row.dateVue, true)}
              <span className="block text-[11px] text-muted-foreground">
                {row.episodeCount} épisode{row.episodeCount > 1 ? "s" : ""}
              </span>
            </span>
          );
        }
        return editingDate === row.watchId ? (
          <input
            type="datetime-local"
            aria-label="Date du visionnage"
            className={selectClass}
            defaultValue={toLocalInput(row.dateVue)}
            max={toLocalInput(new Date().toISOString())}
            autoFocus
            onBlur={(e) => {
              setEditingDate(null);
              const value = e.target.value;
              if (value && value !== toLocalInput(row.dateVue)) {
                patchWatch(row, { date_vue: new Date(value).toISOString() });
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") setEditingDate(null);
            }}
          />
        ) : (
          <button
            type="button"
            className="group inline-flex items-center gap-1 whitespace-nowrap text-left hover:underline"
            onClick={() => setEditingDate(row.watchId)}
            aria-label={`Modifier la date du visionnage du ${formatDate(row.dateVue, true)}`}
          >
            {formatDate(row.dateVue, true)}
            <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-60" />
          </button>
        );
      case "titre":
        if (!row.title) return "Titre inconnu";
        return (
          <Link
            href={
              row.episode && !row.grouped
                ? `/episodes/${row.episode.id}`
                : buildEntityUrl("/titles", row.title.id, row.title.titre)
            }
            className="font-medium hover:underline"
          >
            {row.title.titre}
            {row.episode && !row.grouped && (
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                {episodeCode(row)}
                {row.episode.titre ? ` · ${row.episode.titre}` : ""}
              </span>
            )}
          </Link>
        );
      case "type":
        return row.title?.type === "serie" ? "Série" : "Film";
      case "dateSortie":
        return formatDate(row.dateSortie);
      case "genres":
        return row.genres.join(", ") || "—";
      case "studios":
        return row.studios.map((s) => s.nom).join(", ") || "—";
      case "realisateurs":
        return row.realisateurs.map((p) => p.nom).join(", ") || "—";
      case "noteImdb":
        return row.noteImdb?.toFixed(1) ?? "—";
      case "moyenneApp":
        return row.moyenneApp !== null ? (
          <span
            title={`${row.nombreNotesApp} note${row.nombreNotesApp > 1 ? "s" : ""}`}
          >
            {row.moyenneApp.toFixed(1)}
          </span>
        ) : (
          "—"
        );
      case "notePerso":
        return (
          <select
            aria-label={`Ma note pour ${row.title?.titre ?? ""}`}
            className={selectClass}
            value={row.notePerso ?? ""}
            onChange={(e) =>
              e.target.value && setNote(row, Number(e.target.value))
            }
          >
            <option value="" disabled>
              —
            </option>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}/10
              </option>
            ))}
          </select>
        );
      case "support":
      case "compagnie": {
        if (row.grouped) {
          const values = (column.enumValues?.(row) ?? []).filter(Boolean);
          const label = column.id === "support" ? supportLabel : compagnieLabel;
          return values.map((v) => label(v)).join(", ") || "—";
        }
        const options =
          column.id === "support"
            ? WATCH_SUPPORT_OPTIONS
            : WATCH_COMPAGNIE_OPTIONS;
        return (
          <select
            aria-label={`${column.label} pour ${row.title?.titre ?? ""}`}
            className={selectClass}
            value={row[column.id] ?? ""}
            onChange={(e) =>
              patchWatch(row, { [column.id]: e.target.value || null })
            }
          >
            <option value="">—</option>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        );
      }
      case "emotion":
        if (row.grouped) return emotionLabels(row.emotion) ?? "—";
        return (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="max-w-[12rem] truncate text-left hover:underline"
                  aria-label={`Émotions pour ${row.title?.titre ?? ""}`}
                >
                  {emotionLabels(row.emotion) ?? (
                    <span className="text-muted-foreground">—</span>
                  )}
                </button>
              }
            />
            <DropdownMenuContent align="start">
              {WATCH_EMOTION_OPTIONS.map((o) => {
                const checked = row.emotion.includes(o.value);
                return (
                  <DropdownMenuCheckboxItem
                    key={o.value}
                    checked={checked}
                    onCheckedChange={() => {
                      const next = checked
                        ? row.emotion.filter((v) => v !== o.value)
                        : [...row.emotion, o.value];
                      patchWatch(row, {
                        emotion: next.length > 0 ? next : null,
                      });
                    }}
                  >
                    {o.emoji} {o.label}
                  </DropdownMenuCheckboxItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      case "commentaire":
        return (
          <button
            type="button"
            className="group flex max-w-[16rem] items-start gap-1 text-left"
            onClick={() => {
              setCommentRow(row);
              setCommentDraft(row.commentaire ?? "");
            }}
            aria-label={`Modifier le commentaire pour ${row.title?.titre ?? ""}`}
            title={row.commentaire ?? undefined}
          >
            {row.commentaire ? (
              <span className="line-clamp-2">{row.commentaire}</span>
            ) : (
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground opacity-50 group-hover:opacity-100" />
            )}
          </button>
        );
      case "listes": {
        const ids = new Set(row.listes.map((l) => l.id));
        return (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="max-w-[12rem] truncate text-left hover:underline"
                  aria-label={`Listes contenant ${row.title?.titre ?? ""}`}
                >
                  {row.listes.map((l) => l.nom).join(", ") || (
                    <span className="text-muted-foreground">—</span>
                  )}
                </button>
              }
            />
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>
                {row.episode ? "Listes (la série)" : "Listes"}
              </DropdownMenuLabel>
              {editableLists.map((l) => (
                <DropdownMenuCheckboxItem
                  key={l.id}
                  checked={ids.has(l.id)}
                  onCheckedChange={() => toggleList(row, l.id, ids.has(l.id))}
                >
                  {l.nom}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      }
    }
  };

  const renderFilter = (column: ColumnDef) => {
    const current = filters[column.id];
    if (column.filter === "enum") {
      const values = current?.kind === "enum" ? current.values : [];
      return (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className={cn(
                  selectClass,
                  "w-full text-left",
                  values.length > 0 && "border-primary",
                )}
                aria-label={`Filtrer ${column.label}`}
              >
                {values.length > 0 ? `${values.length} choix` : "Tous"}
              </button>
            }
          />
          <DropdownMenuContent align="start">
            {column.enumOptions?.map((o) => (
              <DropdownMenuCheckboxItem
                key={o.value}
                checked={values.includes(o.value)}
                onCheckedChange={() => {
                  const next = values.includes(o.value)
                    ? values.filter((v) => v !== o.value)
                    : [...values, o.value];
                  setFilter(
                    column.id,
                    next.length > 0 ? { kind: "enum", values: next } : null,
                  );
                }}
              >
                {o.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }
    if (column.filter === "number") {
      return (
        <input
          type="number"
          min={0}
          max={10}
          step={0.5}
          inputMode="decimal"
          aria-label={`${column.label} minimum`}
          placeholder="≥"
          className={cn(selectClass, "w-full")}
          value={current?.kind === "number" ? current.min : ""}
          onChange={(e) =>
            setFilter(
              column.id,
              e.target.value === ""
                ? null
                : { kind: "number", min: Number(e.target.value) },
            )
          }
        />
      );
    }
    return (
      <input
        type="search"
        aria-label={`Filtrer ${column.label}`}
        placeholder="Filtrer…"
        className={cn(selectClass, "w-full min-w-[6rem]")}
        value={current?.kind === "text" ? current.value : ""}
        onChange={(e) =>
          setFilter(
            column.id,
            e.target.value ? { kind: "text", value: e.target.value } : null,
          )
        }
      />
    );
  };

  // --- rendu ------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Erreur lors du chargement de l&apos;historique.
        </AlertDescription>
      </Alert>
    );
  }

  const activeFilters = Object.keys(filters).length;

  return (
    <div className="space-y-3">
      {columnsOpen && (
        <fieldset className="flex flex-wrap gap-x-4 gap-y-2 rounded-lg border p-3">
          <legend className="px-1 text-xs text-muted-foreground">Colonnes affichées</legend>
          {COLUMNS.map((c) => (
            <label key={c.id} className="inline-flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 accent-primary"
                checked={!hidden.includes(c.id)}
                disabled={c.id === "titre"}
                onChange={() => toggleColumn(c.id)}
              />
              {c.label}
            </label>
          ))}
        </fieldset>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {filtersOpen && (
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              checked={groupBySeries}
              onChange={(e) => setGroupBySeries(e.target.checked)}
            />
            Regrouper les épisodes par série
          </label>
        )}

        {activeFilters > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setFilters({})}>
            <X className="h-4 w-4" />
            Effacer les filtres ({activeFilters})
          </Button>
        )}

        <span className="ml-auto text-xs text-muted-foreground">
          {rows.length} ligne{rows.length > 1 ? "s" : ""}
          {data?.truncated &&
            " · historique tronqué aux 5000 visionnages les plus récents"}
        </span>
      </div>

      {actionError && (
        <p role="alert" className="text-sm text-destructive">
          {actionError}
        </p>
      )}

      {/* `relative` : contient les éléments en position absolue du tableau
          (ex. texte sr-only) ; sans lui, ils élargissaient toute la page. */}
      <div className="relative overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-xs text-muted-foreground">
            <tr>
              {visibleColumns.map((c) => {
                const active = sort?.column === c.id;
                const Icon = !active
                  ? ArrowUpDown
                  : sort?.direction === "asc"
                    ? ArrowUp
                    : ArrowDown;
                return (
                  <th
                    key={c.id}
                    scope="col"
                    className="whitespace-nowrap px-2 py-2 font-medium"
                    aria-sort={
                      active
                        ? sort?.direction === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 hover:text-primary"
                      onClick={() => setSort(nextSort(sort, c.id))}
                    >
                      {c.label}
                      <Icon
                        className={cn("h-3.5 w-3.5", !active && "opacity-40")}
                      />
                    </button>
                  </th>
                );
              })}
              <th scope="col" className="w-8 px-2 py-2">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
            {filtersOpen && (
              <tr>
                {visibleColumns.map((c) => (
                  <th key={c.id} className="px-2 pb-2 font-normal">
                    {c.id === "affiche" ? null : renderFilter(c)}
                  </th>
                ))}
                <th />
              </tr>
            )}
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + 1}
                  className="px-2 py-6 text-center text-muted-foreground"
                >
                  {data?.rows.length
                    ? "Aucun visionnage ne correspond aux filtres."
                    : "Aucun visionnage."}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.key}
                  className="border-b align-top hover:bg-muted/20"
                >
                  {visibleColumns.map((c) => (
                    <td key={c.id} className="px-2 py-1.5">
                      {renderCell(c, row)}
                    </td>
                  ))}
                  <td className="px-2 py-1.5">
                    {!row.grouped && (
                      <button
                        type="button"
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                        aria-label={`Supprimer le visionnage de ${row.title?.titre ?? ""} du ${formatDate(row.dateVue, true)}`}
                        onClick={() => setToDelete(row)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog
        open={commentRow !== null}
        onOpenChange={(open) => !open && setCommentRow(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Commentaire · {commentRow?.title?.titre}
              {commentRow?.episode && !commentRow.grouped
                ? ` ${episodeCode(commentRow)}`
                : ""}
            </DialogTitle>
          </DialogHeader>
          <Textarea
            aria-label="Commentaire"
            value={commentDraft}
            onChange={(e) => setCommentDraft(e.target.value)}
            maxLength={2000}
            rows={4}
            autoFocus
          />
          <p className="text-xs text-muted-foreground">
            Le même commentaire que sur la page{" "}
            {commentRow?.episode && !commentRow.grouped
              ? "de l'épisode"
              : "du titre"}
            . Vide pour l&apos;effacer.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCommentRow(null)}>
              Annuler
            </Button>
            <Button onClick={saveComment} disabled={upsertRating.isPending}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce visionnage ?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete?.title?.titre}
              {toDelete?.episode ? ` ${episodeCode(toDelete)}` : ""}, vu le{" "}
              {formatDate(toDelete?.dateVue ?? null, true)}. Les autres
              visionnages, la note et le commentaire sont conservés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (!toDelete) return;
                deleteWatch.mutate(toDelete.watchId, {
                  onSuccess: () => {
                    refresh();
                    setToDelete(null);
                  },
                  onError,
                });
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

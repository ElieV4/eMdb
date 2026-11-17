/**
 * Module « Modifier le contenu », sous l'en-tête des pages de titres :
 * 1. on choisit l'action (et sa liste ou son groupe cible) ;
 * 2. on sélectionne les titres concernés (cases sur les affiches) ;
 * 3. « Valider » applique l'action à toute la sélection d'un coup.
 *
 * La page garde la sélection (useSelectionMode) et affiche les cases dès
 * qu'une action est choisie (sauf « Réordonner », qui passe en
 * glisser-déposer).
 */

"use client";

import { useState } from "react";
import { Check, Loader2, X } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { useAddItem } from "@/hooks/api/useAddItem";
import { useRemoveItem } from "@/hooks/api/useRemoveItem";
import { useCreateWatch } from "@/hooks/api/useCreateWatch";
import { useDeleteWatch } from "@/hooks/api/useDeleteWatch";
import { useSetItemGroups } from "@/hooks/api/useListGroups";
import { useGetOrImportTitle } from "@/hooks/api/useGetOrImportTitle";
import { useLists } from "@/hooks/api/useLists";
import { useSharedLists } from "@/hooks/api/useSharedLists";
import {
  ACTION_LABELS,
  BulkActionId,
  BulkContext,
  BulkItem,
  actionTarget,
  availableActions,
  groupUpdates,
  uniqueTitleIds,
} from "@/lib/bulkEdit";
import { flattenGroupTree } from "@/lib/listGroups";
import { ListGroup } from "@/lib/types/api";
import { cn } from "@/lib/utils";

type BulkEditPanelProps = BulkContext & {
  action: BulkActionId | null;
  onActionChange: (action: BulkActionId | null) => void;
  /** Éléments sélectionnés. */
  selected: BulkItem[];
  /** Nombre d'éléments sélectionnables (pour « Tout sélectionner »). */
  selectableCount?: number;
  onSelectAll?: () => void;
  onClearSelection: () => void;
  /** Groupes de la liste active, et groupes de chaque titre. */
  groups?: ListGroup[];
  groupIdsByTitle?: Map<string, string[]>;
  onClose: () => void;
  className?: string;
};

export function BulkEditPanel({
  action,
  onActionChange,
  selected,
  selectableCount,
  onSelectAll,
  onClearSelection,
  groups = [],
  groupIdsByTitle,
  onClose,
  className,
  ...ctx
}: BulkEditPanelProps) {
  const [targetId, setTargetId] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ ok: number; failed: number } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const addItem = useAddItem();
  const removeItem = useRemoveItem();
  const createWatch = useCreateWatch();
  const deleteWatch = useDeleteWatch();
  const setItemGroups = useSetItemGroups();
  const getOrImportTitle = useGetOrImportTitle();
  const { data: ownLists } = useLists(true);
  const { data: sharedLists } = useSharedLists();

  const actions = availableActions({ ...ctx, hasGroups: groups.length > 0 });
  const target = action ? actionTarget(action) : null;

  // Listes cibles : les siennes, et les listes partagées où l'on peut ajouter
  // (pour « retirer », celles où l'on peut retirer) ; jamais la liste active.
  const listOptions = [
    ...(ownLists ?? []).map((l) => ({ id: l.id, nom: l.nom })),
    ...(sharedLists ?? [])
      .filter((s) =>
        action === "removeFromList" ? s.capabilities.canRemoveItems : s.capabilities.canAddItems,
      )
      .map((s) => ({ id: s.list.id, nom: `${s.list.nom} (partagée)` })),
  ].filter((l) => l.id !== ctx.activeList?.id);
  const groupOptions = flattenGroupTree(groups);

  const chooseAction = (next: BulkActionId | null) => {
    setTargetId("");
    setResult(null);
    onClearSelection();
    onActionChange(next);
  };

  /** Ids locaux : les titres TMDB pas encore en base sont importés d'abord. */
  const resolveTitleIds = async (): Promise<string[]> => {
    const resolved = await Promise.all(
      selected.map(async (item) => {
        if (item.local !== false) return item.titleId;
        if (!item.tmdbId || !item.type) return null;
        try {
          return (await getOrImportTitle.mutateAsync({ tmdbId: item.tmdbId, type: item.type })).id;
        } catch {
          return null;
        }
      }),
    );
    return [...new Set(resolved.filter((id): id is string => !!id))];
  };

  const run = async () => {
    if (!action) return;
    setPending(true);
    const titleIds = selected.some((i) => i.local === false) ? await resolveTitleIds() : uniqueTitleIds(selected);
    let tasks: (() => Promise<unknown>)[] = [];
    switch (action) {
      case "markWatched":
        tasks = titleIds.map((titleId) => () => createWatch.mutateAsync({ title_id: titleId }));
        break;
      case "removeFromActive":
        if (!ctx.activeList) break;
        tasks = titleIds.map((titleId) => () => removeItem.mutateAsync({ listId: ctx.activeList!.id, titleId }));
        break;
      case "addToList":
        tasks = titleIds.map((titleId) => () => addItem.mutateAsync({ listId: targetId, data: { title_id: titleId } }));
        break;
      case "removeFromList":
        tasks = titleIds.map((titleId) => () => removeItem.mutateAsync({ listId: targetId, titleId }));
        break;
      case "addToGroup":
      case "removeFromGroup":
        if (!ctx.activeList || !groupIdsByTitle) break;
        tasks = groupUpdates(titleIds, groupIdsByTitle, targetId, action === "addToGroup" ? "add" : "remove").map(
          (u) => () => setItemGroups.mutateAsync({ listId: ctx.activeList!.id, titleId: u.titleId, groupIds: u.groupIds }),
        );
        break;
      case "deleteHistory": {
        const watchIds = [...new Set(selected.map((i) => i.watchId).filter((id): id is string => !!id))];
        tasks = watchIds.map((watchId) => () => deleteWatch.mutateAsync(watchId));
        break;
      }
      case "reorder":
        break;
    }
    const settled = await Promise.allSettled(tasks.map((t) => t()));
    setPending(false);
    const failed = settled.filter((s) => s.status === "rejected").length;
    setResult({ ok: settled.length - failed, failed });
    onClearSelection();
  };

  const needsTarget = target !== null && !targetId;
  const canValidate = !!action && action !== "reorder" && selected.length > 0 && !needsTarget && !pending;

  return (
    <section
      aria-label="Modifier le contenu"
      className={cn("space-y-3 rounded-lg border bg-muted/20 p-3", className)}
    >
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="bulk-action" className="text-sm font-medium">
          Action
        </label>
        <select
          id="bulk-action"
          value={action ?? ""}
          onChange={(e) => chooseAction((e.target.value || null) as BulkActionId | null)}
          className="h-8 rounded-md border bg-background px-2 text-sm"
        >
          <option value="">Choisir une action…</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {ACTION_LABELS[a]}
            </option>
          ))}
        </select>

        {target === "list" && (
          <select
            aria-label="Liste cible"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="h-8 rounded-md border bg-background px-2 text-sm"
          >
            <option value="">Choisir une liste…</option>
            {listOptions.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nom}
              </option>
            ))}
          </select>
        )}
        {target === "group" && (
          <select
            aria-label="Groupe cible"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="h-8 rounded-md border bg-background px-2 text-sm"
          >
            <option value="">Choisir un groupe…</option>
            {groupOptions.map((g) => (
              <option key={g.id} value={g.id}>
                {"  ".repeat(g.depth)}
                {g.depth > 0 ? "› " : ""}
                {g.nom}
              </option>
            ))}
          </select>
        )}

        <Button type="button" variant="ghost" size="sm" className="ml-auto" onClick={onClose}>
          <X className="h-4 w-4" />
          Terminer
        </Button>
      </div>

      {action && action !== "reorder" && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm">
            <strong>{selected.length}</strong> sélectionné{selected.length > 1 ? "s" : ""}
          </span>
          {onSelectAll && selectableCount !== undefined && selected.length < selectableCount && (
            <button type="button" onClick={onSelectAll} className="text-xs text-primary hover:underline">
              Tout sélectionner ({selectableCount})
            </button>
          )}
          {selected.length > 0 && (
            <button type="button" onClick={onClearSelection} className="text-xs text-muted-foreground hover:underline">
              Tout désélectionner
            </button>
          )}
          <Button
            type="button"
            size="sm"
            className="ml-auto"
            disabled={!canValidate}
            onClick={() => (action === "deleteHistory" ? setConfirmOpen(true) : run())}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Valider
          </Button>
        </div>
      )}

      {action === "reorder" && (
        <p className="text-sm text-muted-foreground">
          Glissez-déposez les affiches pour changer l&apos;ordre ; il est enregistré à chaque déplacement.
        </p>
      )}
      {!action && (
        <p className="text-sm text-muted-foreground">
          Choisissez une action, puis sélectionnez les titres concernés et validez.
        </p>
      )}
      {action && needsTarget && (
        <p className="text-sm text-muted-foreground">
          Choisissez {target === "list" ? "la liste" : "le groupe"} concerné{target === "list" ? "e" : ""}.
        </p>
      )}
      {result && (
        <p role="status" className={cn("text-sm", result.failed ? "text-destructive" : "text-muted-foreground")}>
          {result.ok} titre{result.ok > 1 ? "s" : ""} modifié{result.ok > 1 ? "s" : ""}
          {result.failed > 0 && ` · ${result.failed} échec${result.failed > 1 ? "s" : ""}`}.
        </p>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer de l&apos;historique ?</AlertDialogTitle>
            <AlertDialogDescription>
              {selected.length} visionnage{selected.length > 1 ? "s" : ""} seront définitivement supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setConfirmOpen(false);
                run();
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

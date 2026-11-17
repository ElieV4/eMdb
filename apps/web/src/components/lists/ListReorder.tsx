/**
 * Réordonnancement des items d'une liste par drag & drop + retrait en un
 * clic — mode édition de /lists/:id ("Modifier le contenu", modification S).
 *
 * Rangement dans les groupes et sous-groupes : un groupe cible choisi dans
 * la barre du haut donne, sous chaque titre, un bouton pour l'y ajouter ou
 * l'en retirer ; « Groupes… » ouvre le choix complet (plusieurs groupes).
 */

"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, FolderTree, Loader2, Plus, X } from "lucide-react";
import { useReorderItems } from "@/hooks/api/useReorderItems";
import { useRemoveListItem } from "@/hooks/api/useRemoveListItem";
import { TitleCard } from "@/components/titles/TitleCard";
import { useWatchedTitles, useListMembership } from "@/hooks/api";
import { useSetItemGroups } from "@/hooks/api/useListGroups";
import { EditGroupsBar } from "@/components/lists/EditGroupsBar";
import { ItemGroupsDialog } from "@/components/lists/ItemGroupsDialog";
import { Button } from "@/components/ui/button";
import { ListGroup, TitleSearchResult } from "@/lib/types/api";

type ListReorderProps = {
  listId: string;
  items: TitleSearchResult[];
  /** Bouton de retrait sur chaque titre. Faux pour un membre en mode
   * "collaboratif" : il peut réordonner, pas retirer (cf. capabilities). */
  canRemove?: boolean;
  /** Groupes et sous-groupes de la liste. */
  groups?: ListGroup[];
  /** Groupes où chaque titre est rangé directement (id du titre → ids). */
  groupIdsByTitle?: Map<string, string[]>;
  /** Ranger / déranger les titres (droit `item:update`, cf. capabilities). */
  canEditGroups?: boolean;
};

function SortableItem({
  title,
  onRemove,
  watched,
  inWatchlist,
  inFavorites,
  footer,
}: {
  title: TitleSearchResult;
  onRemove?: (id: string) => void;
  watched?: boolean;
  inWatchlist?: boolean;
  inFavorites?: boolean;
  /** Contrôles sous la carte (rangement dans les groupes), hors poignée de glisser. */
  footer?: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: title.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group touch-none">
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <TitleCard
          title={title}
          compact
          watched={watched}
          inWatchlist={inWatchlist}
          inFavorites={inFavorites}
        />
      </div>
      {/* Bouton retrait — en frère du <Link> de TitleCard, comme le menu
          actions rapides (un bouton ne peut pas être imbriqué dans un <a>). */}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onRemove(title.id);
          }}
          className="absolute top-2 left-2 z-30 rounded-full bg-destructive/90 hover:bg-destructive p-1.5 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Retirer de la liste"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      {footer}
    </div>
  );
}

export function ListReorder({
  listId,
  items,
  canRemove = true,
  groups = [],
  groupIdsByTitle,
  canEditGroups = false,
}: ListReorderProps) {
  const [targetGroupId, setTargetGroupId] = useState<string | null>(null);
  const [pendingTitleId, setPendingTitleId] = useState<string | null>(null);
  const [dialogTitleId, setDialogTitleId] = useState<string | null>(null);
  const [groupError, setGroupError] = useState<string | null>(null);
  const setItemGroups = useSetItemGroups();
  const showGroups = canEditGroups && !!groupIdsByTitle;
  const groupsOf = (titleId: string) => groupIdsByTitle?.get(titleId) ?? [];
  const target = groups.find((g) => g.id === targetGroupId) ?? null;
  const directCounts = new Map<string, number>();
  for (const ids of groupIdsByTitle?.values() ?? []) {
    for (const id of ids) directCounts.set(id, (directCounts.get(id) ?? 0) + 1);
  }

  const toggleTarget = (titleId: string, titre: string) => {
    if (!target) return;
    const current = groupsOf(titleId);
    const inGroup = current.includes(target.id);
    setGroupError(null);
    setPendingTitleId(titleId);
    setItemGroups.mutate(
      {
        listId,
        titleId,
        groupIds: inGroup ? current.filter((id) => id !== target.id) : [...current, target.id],
      },
      {
        onError: () => setGroupError(`Impossible de modifier les groupes de « ${titre} ».`),
        onSettled: () => setPendingTitleId(null),
      },
    );
  };

  const [orderedIds, setOrderedIds] = useState<string[]>(() => items.map((i) => i.id));
  const reorder = useReorderItems();
  const removeItem = useRemoveListItem();
  const { data: watchedTitles } = useWatchedTitles();
  const { watchlistIds, favoriteIds } = useListMembership();

  // Resynchronise l'ordre local quand la liste change côté serveur (retrait
  // d'un item, ou premier chargement) — évite de garder des ids retirés.
  useEffect(() => {
    setOrderedIds(items.map((i) => i.id));
  }, [items]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const byId = new Map(items.map((i) => [i.id, i]));
  const orderedItems = orderedIds
    .map((id) => byId.get(id))
    .filter((item): item is TitleSearchResult => !!item);

  const handleDragEnd = (event: { active: { id: string | number }; over: { id: string | number } | null }) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedIds.indexOf(String(active.id));
    const newIndex = orderedIds.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(orderedIds, oldIndex, newIndex);
    setOrderedIds(newOrder);

    reorder.mutate({
      listId,
      items: newOrder.map((id, index) => ({ title_id: id, position: index })),
    });
  };

  const handleRemove = (titleId: string) => {
    setOrderedIds((ids) => ids.filter((id) => id !== titleId));
    removeItem.mutate({ listId, titleId });
  };

  if (orderedItems.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Cette liste est vide.
      </p>
    );
  }

  const dialogItem = dialogTitleId ? byId.get(dialogTitleId) : undefined;

  const groupFooter = (item: TitleSearchResult) => {
    if (!showGroups || groups.length === 0) return undefined;
    const inTarget = !!target && groupsOf(item.id).includes(target.id);
    const pending = pendingTitleId === item.id;
    return (
      <div className="mt-2 flex flex-col gap-1">
        {target && (
          <Button
            type="button"
            size="sm"
            variant={inTarget ? "secondary" : "outline"}
            className="w-full"
            disabled={pendingTitleId !== null}
            onClick={() => toggleTarget(item.id, item.titre)}
            aria-label={
              inTarget ? `Retirer ${item.titre} de ${target.nom}` : `Ajouter ${item.titre} à ${target.nom}`
            }
            title={inTarget ? `Dans « ${target.nom} » : cliquer pour retirer` : undefined}
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : inTarget ? (
              <Check className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            <span className="truncate">{inTarget ? target.nom : `Ajouter à ${target.nom}`}</span>
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="w-full text-xs text-muted-foreground"
          onClick={() => setDialogTitleId(item.id)}
          aria-label={`Groupes de ${item.titre}`}
        >
          <FolderTree className="h-3.5 w-3.5" />
          Groupes… ({groupsOf(item.id).length})
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {showGroups && (
        <EditGroupsBar
          groups={groups}
          targetGroupId={target?.id ?? null}
          onTargetChange={setTargetGroupId}
          counts={directCounts}
        />
      )}
      {groupError && <p className="text-sm text-destructive">{groupError}</p>}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={orderedIds} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {orderedItems.map((item) => (
            <SortableItem
              key={item.id}
              title={item}
              onRemove={canRemove ? handleRemove : undefined}
              watched={watchedTitles?.has(item.id)}
              inWatchlist={watchlistIds.has(item.id)}
              inFavorites={favoriteIds.has(item.id)}
              footer={groupFooter(item)}
            />
          ))}
        </div>
      </SortableContext>
      </DndContext>
      {showGroups && (
        <ItemGroupsDialog
          open={!!dialogItem}
          onOpenChange={(open) => !open && setDialogTitleId(null)}
          listId={listId}
          groups={groups}
          item={
            dialogItem
              ? { id: dialogItem.id, titre: dialogItem.titre, groupIds: groupsOf(dialogItem.id) }
              : null
          }
        />
      )}
    </div>
  );
}

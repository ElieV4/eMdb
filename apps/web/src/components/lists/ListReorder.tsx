/**
 * Réordonnancement des items d'une liste par drag & drop + retrait en un
 * clic — mode édition de /lists/:id ("Modifier le contenu", modification S).
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
import { X } from "lucide-react";
import { useReorderItems } from "@/hooks/api/useReorderItems";
import { useRemoveListItem } from "@/hooks/api/useRemoveListItem";
import { TitleCard } from "@/components/titles/TitleCard";
import { useWatchedTitles, useListMembership } from "@/hooks/api";
import { TitleSearchResult } from "@/lib/types/api";

type ListReorderProps = {
  listId: string;
  items: TitleSearchResult[];
};

function SortableItem({
  title,
  onRemove,
  watched,
  inWatchlist,
  inFavorites,
}: {
  title: TitleSearchResult;
  onRemove: (id: string) => void;
  watched?: boolean;
  inWatchlist?: boolean;
  inFavorites?: boolean;
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
    </div>
  );
}

export function ListReorder({ listId, items }: ListReorderProps) {
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

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={orderedIds} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {orderedItems.map((item) => (
            <SortableItem
              key={item.id}
              title={item}
              onRemove={handleRemove}
              watched={watchedTitles?.has(item.id)}
              inWatchlist={watchlistIds.has(item.id)}
              inFavorites={favoriteIds.has(item.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

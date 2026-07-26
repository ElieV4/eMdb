/**
 * Réordonnancement des items d'une liste par drag & drop.
 * Utilise @dnd-kit/core.
 *
 * Phase 4.3 — Lists
 */

"use client";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { useReorderItems } from "@/hooks/api/useReorderItems";
import { TitleCard } from "@/components/titles/TitleCard";
import { TitleSearchResult } from "@/lib/types/api";
import { Skeleton } from "@/components/ui/skeleton";

type ListReorderProps = {
  items: Array<{
    title_id: string;
    position: number | null;
    titles: TitleSearchResult;
  }>;
  onSuccess?: () => void;
};

function SortableItem({
  title,
  onRemove,
}: {
  title: TitleSearchResult;
  onRemove?: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: title.id });

  const style = {
    transform: `translate3d(${transform?.x ?? 0}px, ${transform?.y ?? 0}px, 0)`,
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <div {...attributes} {...listeners}>
        <TitleCard title={title} showType={false} />
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={() => onRemove(title.id)}
          className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Retirer"
        >
          ×
        </button>
      )}
    </div>
  );
}

export function ListReorder({ items, onSuccess }: ListReorderProps) {
  const reorder = useReorderItems();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.title_id === active.id);
    const newIndex = items.findIndex((i) => i.title_id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newItems = arrayMove(items, oldIndex, newIndex);

    try {
      await reorder.mutateAsync({
        listId: items[0]?.title_id || "",
        items: newItems.map((item, index) => ({
          title_id: item.title_id,
          position: index,
        })),
      });
      onSuccess?.();
    } catch {
      // handled by React Query
    }
  };

  if (reorder.isPending) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {items.map((item) => (
          <Skeleton key={item.title_id} className="h-64 w-full" />
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map((i) => i.title_id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {items.map((item) => (
            <SortableItem
              key={item.title_id}
              title={item.titles}
              onRemove={onSuccess}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
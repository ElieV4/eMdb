/**
 * Grille d'items d'une liste (TitleCards).
 *
 * Phase 4.3 — Lists
 */

"use client";

import { TitleCard } from "@/components/titles/TitleCard";
import { useWatchedTitles, useFollowedTitleIds } from "@/hooks/api";
import { TitleSearchResult } from "@/lib/types/api";

type ListItemsGridProps = {
  items: Array<{
    title_id: string;
    position: number | null;
    titles: TitleSearchResult;
  }>;
  onRemove?: (titleId: string) => void;
  canEdit?: boolean;
};

export function ListItemsGrid({
  items,
  onRemove,
  canEdit = false,
}: ListItemsGridProps) {
  const { data: watchedTitles } = useWatchedTitles();
  const { data: followedTitleIds } = useFollowedTitleIds();

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Cette liste est vide.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {items.map((item) => (
        <div key={item.title_id} className="relative group">
          <TitleCard
            title={item.titles}
            showType={false}
            watched={watchedTitles?.has(item.title_id)}
            followed={followedTitleIds?.has(item.title_id)}
          />
          {canEdit && onRemove && (
            <button
              type="button"
              onClick={() => onRemove(item.title_id)}
              className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Retirer de la liste"
            >
              ×
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

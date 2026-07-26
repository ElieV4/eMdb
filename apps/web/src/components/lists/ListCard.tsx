/**
 * Card affichant une liste (nom, type, nb items).
 *
 * Phase 4.3 — Lists
 */

"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { UserList } from "@/lib/types/api";

type ListCardProps = {
  list: UserList;
  className?: string;
};

const typeLabels: Record<string, string> = {
  watchlist: "Watchlist",
  favoris: "Favoris",
  custom: "Personnalisée",
};

export function ListCard({ list, className }: ListCardProps) {
  const itemCount = list.items?.length ?? 0;

  return (
    <Card className={cn("p-4 h-full", className)}>
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold line-clamp-1">{list.nom}</h3>
        <Badge variant="secondary" className="ml-2 shrink-0">
          {typeLabels[list.type] ?? list.type}
        </Badge>
      </div>
      {list.description && (
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {list.description}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        {itemCount} titre{itemCount !== 1 ? "s" : ""}
      </p>
    </Card>
  );
}
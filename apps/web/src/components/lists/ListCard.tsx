/**
 * Card affichant une liste (nom, type, nb items).
 *
 * Phase 4.3 — Lists
 */

"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ListActionsMenu } from "./ListActionsMenu";
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
  const itemCount = list._count?.list_items ?? list.items?.length ?? 0;
  const isCustom = list.type === "custom";

  return (
    <div className={cn("relative h-full", className)}>
      {/* Le menu "⋮" est un bouton — il ne peut pas être imbriqué dans le
          <Link> ci-dessous (HTML invalide), donc il est rendu en frère,
          positionné par-dessus (même pattern que TitleQuickActionsMenu). */}
      {isCustom && (
        <ListActionsMenu list={list} variant="icon" className="absolute top-3 right-3 z-10" />
      )}
      <Link href={`/lists/${list.id}`} className="block h-full">
        <Card className="p-4 h-full transition-colors hover:bg-muted/50">
          <div className={cn("flex items-start justify-between mb-2", isCustom && "pr-8")}>
            <h3 className="font-semibold line-clamp-1" title={list.nom}>{list.nom}</h3>
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
      </Link>
    </div>
  );
}

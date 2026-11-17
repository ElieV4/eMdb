/**
 * Carte d'une liste partagée avec l'utilisateur (GET /shared-lists) :
 * nom, créateur, mode de partage et nombre de titres.
 */

"use client";

import { withEmoji } from "@/components/common/EmojiPicker";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SHARE_MODE_LABELS } from "@/lib/shareModes";
import { SharedListEntry } from "@/lib/types/api";
import { cn } from "@/lib/utils";

type SharedListCardProps = {
  entry: SharedListEntry;
  className?: string;
};

export function SharedListCard({ entry, className }: SharedListCardProps) {
  const { list, share_mode } = entry;
  const itemCount = list.item_count;

  return (
    <Link href={`/lists/${list.id}`} className={cn("block h-full", className)}>
      <Card className="p-4 h-full transition-colors hover:bg-muted/50">
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-semibold line-clamp-1" title={list.nom}>
            {withEmoji(list.nom, list.emoji)}
          </h3>
          <Badge variant="secondary" className="ml-2 shrink-0">
            {SHARE_MODE_LABELS[share_mode]}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mb-2">par {list.owner.pseudo}</p>
        {list.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{list.description}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {itemCount} titre{itemCount !== 1 ? "s" : ""}
        </p>
      </Card>
    </Link>
  );
}

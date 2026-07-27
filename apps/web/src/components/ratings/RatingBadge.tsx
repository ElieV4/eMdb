/**
 * Badge affichant une note (ex: 8.5/10).
 *
 * Phase 4.2 — Ratings
 */

"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type RatingBadgeProps = {
  note: number | null | undefined;
  className?: string;
};

export function RatingBadge({ note, className }: RatingBadgeProps) {
  if (note === null || note === undefined) {
    return null;
  }

  const formatted = Number.isInteger(note) ? `${note}/10` : `${Number(note).toFixed(1)}/10`;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-yellow-400/10 px-2 py-0.5 text-xs font-medium text-yellow-600 dark:text-yellow-400",
        className
      )}
    >
      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
      {formatted}
    </span>
  );
}
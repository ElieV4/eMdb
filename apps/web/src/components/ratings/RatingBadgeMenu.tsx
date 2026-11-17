/**
 * Note perso en vue tableau : badge « ★ 8 » (ou « Noter ») suivi des emojis
 * d'émotion ; un clic ouvre le choix de la note (1 à 10).
 */

"use client";

import { Star } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { actionBadgeClass } from "@/components/common/ActionBadge";
import { emotionEmojis, emotionLabels } from "@/lib/watchContext";

const NOTES = Array.from({ length: 10 }, (_, i) => 10 - i);

type RatingBadgeMenuProps = {
  value: number | null | undefined;
  onChange?: (note: number) => void;
  /** Émotions affichées après la note (emojis). */
  emotions?: string[] | null;
  /** Nom du titre, pour le libellé accessible. */
  titleName: string;
  disabled?: boolean;
};

export function RatingNoteContent({
  value,
}: {
  value: number | null | undefined;
}) {
  return value != null ? (
    <>
      <Star className="h-3 w-3 fill-primary text-primary" />
      {value}
    </>
  ) : (
    <>Noter</>
  );
}

export function RatingBadgeMenu({
  value,
  onChange,
  emotions,
  titleName,
  disabled,
}: RatingBadgeMenuProps) {
  const emojis = emotionEmojis(emotions);
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      {onChange && !disabled ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className={actionBadgeClass(value == null)}
                aria-label={`Ma note pour ${titleName}${value != null ? ` : ${value}/10` : ""}`}
              >
                <RatingNoteContent value={value} />
              </button>
            }
          />
          <DropdownMenuContent align="start">
            <DropdownMenuRadioGroup
              value={value != null ? String(value) : ""}
              onValueChange={(v) => onChange(Number(v))}
            >
              {/* Le libellé doit être dans un groupe (Base UI). */}
              <DropdownMenuLabel>Ma note</DropdownMenuLabel>
              {NOTES.map((n) => (
                <DropdownMenuRadioItem key={n} value={String(n)}>
                  {n}/10
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : value != null ? (
        <span className="inline-flex items-center gap-1">
          <RatingNoteContent value={value} />
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      )}
      {emojis && (
        <span
          title={emotionLabels(emotions) ?? undefined}
          aria-label={`Émotions : ${emotionLabels(emotions) ?? ""}`}
        >
          {emojis}
        </span>
      )}
    </span>
  );
}

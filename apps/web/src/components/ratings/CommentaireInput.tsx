/**
 * Textarea pour le commentaire d'une note.
 *
 * Phase 4.2 — Ratings
 */

"use client";

import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type CommentaireInputProps = {
  value?: string | null;
  onChange: (value: string) => void;
  className?: string;
};

export function CommentaireInput({
  value,
  onChange,
  className,
}: CommentaireInputProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor="rating-commentaire">Commentaire (optionnel)</Label>
      <Textarea
        id="rating-commentaire"
        placeholder="Votre avis sur ce titre..."
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        maxLength={2000}
        rows={3}
      />
      <p className="text-xs text-muted-foreground">
        {value?.length ?? 0}/2000 caractères
      </p>
    </div>
  );
}

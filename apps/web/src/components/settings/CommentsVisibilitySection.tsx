/**
 * Réglage (enregistré sur le compte, pas sur l'appareil) : rendre ses
 * commentaires perso visibles des membres de ses listes partagées, sur les
 * titres de ces listes.
 */

"use client";

import { MessageSquareText } from "lucide-react";
import { useMyProfile, useSetCommentsVisibility } from "@/hooks/api/useComments";
import { useAuthStore } from "@/store/authStore";

export function CommentsVisibilitySection() {
  const { isAuthenticated } = useAuthStore();
  const { data: profile, isLoading } = useMyProfile(isAuthenticated);
  const setVisibility = useSetCommentsVisibility();

  if (!isAuthenticated) return null;

  const checked = setVisibility.isPending
    ? (setVisibility.variables ?? false)
    : (profile?.commentaires_visibles ?? false);

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <MessageSquareText className="h-5 w-5 text-primary" />
        Commentaires dans les listes partagées
      </h2>
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 accent-primary"
          checked={checked}
          disabled={isLoading || setVisibility.isPending}
          onChange={(e) => setVisibility.mutate(e.target.checked)}
        />
        <span>
          Montrer mes commentaires perso aux membres de mes listes partagées
          <span className="block text-muted-foreground">
            Sur les titres de ces listes uniquement. Enregistré sur votre compte. Les
            commentaires du fil de discussion d&apos;une liste sont toujours visibles de
            ses membres.
          </span>
        </span>
      </label>
      {setVisibility.isError && (
        <p role="alert" className="text-sm text-destructive">
          Impossible d&apos;enregistrer ce réglage.
        </p>
      )}
    </section>
  );
}

/**
 * Section "Mon commentaire" de la page d'un titre (utilisateur connecté).
 */

"use client";

import { useAuthStore } from "@/store/authStore";
import { useMyTitleRating } from "@/hooks/api/useComments";
import { MyCommentEditor } from "./MyCommentEditor";

export function TitleCommentSection({ titleId }: { titleId: string }) {
  const { isAuthenticated } = useAuthStore();
  const { data: rating, isLoading } = useMyTitleRating(titleId, isAuthenticated);

  if (!isAuthenticated || isLoading) return null;

  return (
    <section className="rounded-lg border p-4" aria-label="Mon commentaire">
      <MyCommentEditor titleId={titleId} value={rating?.commentaire} />
    </section>
  );
}

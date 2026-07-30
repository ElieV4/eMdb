/**
 * Hook API pour supprimer une note (DELETE /ratings/:id).
 * Phase 4.2 — Ratings
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";

export function useDeleteRating() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ratingId: string) =>
      apiFetch(`/ratings/${ratingId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-ratings"] });
      queryClient.invalidateQueries({ queryKey: ["title-ratings-summary"] });
    },
  });
}

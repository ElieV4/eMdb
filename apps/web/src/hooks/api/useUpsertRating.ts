/**
 * Hook API pour créer/mettre à jour une note (PUT /ratings).
 * Phase 4.2 — Ratings
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";
import { RatingUpsertInput } from "@/lib/types/api";

export function useUpsertRating() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RatingUpsertInput) =>
      apiFetch("/ratings", {
        method: "PUT",
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-ratings"] });
      queryClient.invalidateQueries({ queryKey: ["title-ratings-summary"] });
    },
  });
}
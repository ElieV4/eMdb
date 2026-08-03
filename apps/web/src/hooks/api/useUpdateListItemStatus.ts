/**
 * Hook API pour mettre à jour le statut de progression d'un item de la
 * watchlist ("en_cours" / "a_jour" / "abandonnee").
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";

export type WatchlistItemStatus = "en_cours" | "a_jour" | "abandonnee";

export function useUpdateListItemStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      listId,
      titleId,
      statut,
    }: {
      listId: string;
      titleId: string;
      statut: WatchlistItemStatus;
    }) =>
      apiFetch(`/lists/${listId}/items/${titleId}/statut`, {
        method: "PATCH",
        body: JSON.stringify({ statut }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lists"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["list"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["continue-watching"], exact: false });
    },
  });
}
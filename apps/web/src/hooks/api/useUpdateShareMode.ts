/**
 * Hook API pour changer le mode de partage d'une liste
 * (PATCH /lists/:listId/share-mode). Créateur uniquement.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";
import { ShareMode } from "@/lib/types/api";

export function useUpdateShareMode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ listId, shareMode }: { listId: string; shareMode: ShareMode }) =>
      apiFetch(`/lists/${listId}/share-mode`, {
        method: "PATCH",
        body: { share_mode: shareMode },
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["list", variables.listId] });
      queryClient.invalidateQueries({ queryKey: ["lists"] });
    },
  });
}

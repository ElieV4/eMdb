/**
 * Hook API pour ajouter un membre à une liste (POST /lists/:listId/shares).
 * Les droits du membre découlent du mode de partage de la liste.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";
import { ShareListInput } from "@/lib/types/api";

export function useShareList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ listId, data }: { listId: string; data: ShareListInput }) =>
      apiFetch(`/lists/${listId}/shares`, {
        method: "POST",
        body: data,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["shares", variables.listId] });
      // Compteur "partagée avec N" des cartes de /lists.
      queryClient.invalidateQueries({ queryKey: ["lists"] });
    },
  });
}

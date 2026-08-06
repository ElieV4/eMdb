/**
 * Hook API pour rafraîchir les données d'une personne depuis TMDB
 * (bio, photo, wiki_url, etc.).
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";

export function useRefreshPerson(personId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiFetch(`/people/${personId}/refresh`, {
        method: "PATCH",
        timeoutMs: 30_000,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["people", personId],
        exact: true,
      });
    },
  });
}

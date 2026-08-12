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
    // `exact: true` avec la mauvaise clé (["people", personId]) n'invalidait
    // jamais réellement usePerson (clé réelle : ["people", "detail", id]) —
    // corrigé. `onSettled` (pas seulement `onSuccess`) pour la même raison
    // que useRefreshTitle/useRefreshFilmography : ne pas rester périmé si le
    // refresh dépasse le timeout côté client.
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["people", "detail", personId],
        exact: true,
      });
    },
  });
}

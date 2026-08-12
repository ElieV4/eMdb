/**
 * Hook API pour rafraîchir la filmographie d'une personne depuis TMDB.
 * Bug 27 — Filmographie : pas de mise à jour TMDB au chargement de la page
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";

export function useRefreshFilmography(personId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      // Le refresh peut déclencher l'import de plusieurs titres TMDB (+ leurs
      // crédits) séquentiellement côté back : le timeout par défaut de 10s
      // abandonnerait la requête avant la fin, sans jamais invalider le cache.
      apiFetch(`/people/${personId}/filmography/refresh`, {
        method: "POST",
        timeoutMs: 120_000,
      }),
    // `onSettled` (pas seulement `onSuccess`) : un refresh long peut dépasser
    // le timeout côté client (mutation en erreur) alors que l'import a
    // continué et fini côté serveur — sans ça, la filmographie affichée
    // restait périmée tant que la page n'était pas rechargée manuellement.
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["people", "filmography", personId],
        exact: true,
      });
    },
  });
}

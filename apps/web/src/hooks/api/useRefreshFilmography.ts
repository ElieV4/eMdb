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
    onSuccess: () => {
      // Invalider le cache de la filmographie pour forcer le re-fetch
      queryClient.invalidateQueries({
        queryKey: ["people", "filmography", personId],
        exact: true,
      });
    },
  });
}

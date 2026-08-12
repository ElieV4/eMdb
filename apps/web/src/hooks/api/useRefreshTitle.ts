/**
 * Hook API pour rafraîchir un titre depuis TMDB, casting inclus
 * (PATCH /titles/:id/refresh) — bouton "Actualiser" de la page titre.
 * Utile notamment pour les titres importés sans casting (ex. backfill
 * Trakt en masse) : seul moyen de compléter leur distribution après coup.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";

export function useRefreshTitle(titleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      // Réimporte tout le casting : potentiellement long (plusieurs dizaines
      // d'appels TMDB pour les personnes) — même raison que useRefreshFilmography.
      apiFetch(`/titles/${titleId}/refresh`, {
        method: "PATCH",
        timeoutMs: 120_000,
      }),
    // `onSettled` (pas seulement `onSuccess`) : un import long peut dépasser
    // le timeout côté client (mutation en erreur) alors que l'import a bien
    // continué et fini côté serveur — sans ça, le contenu affiché restait
    // périmé tant que la page n'était pas rechargée manuellement (retour
    // utilisateur : "souvent pas visible direct, faut recharger la page").
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["titles", "detail", titleId] });
      queryClient.invalidateQueries({ queryKey: ["titles", titleId, "credits"] });
      queryClient.invalidateQueries({ queryKey: ["titles", titleId, "seasons"] });
    },
  });
}

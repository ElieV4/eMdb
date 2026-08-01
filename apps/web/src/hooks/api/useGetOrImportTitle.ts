/**
 * Hook API pour "get or import" un titre par tmdb_id (GET /titles/tmdb/:tmdbId).
 * Utilisé par TitleQuickActionsMenu (modification M) : sur les résultats de
 * recherche non-locaux, `TitleCard`'s `id` n'est que le tmdb_id sous forme de
 * chaîne (pas un vrai UUID) — toute action (suivre, favoris, marquer vu)
 * doit d'abord importer le titre pour obtenir un id local valide, sinon la
 * mutation échoue en 400 (bug remonté : icônes/menu ⋮ "ne marchent pas" sur
 * la page recherche).
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";

export function useGetOrImportTitle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tmdbId, type }: { tmdbId: number; type: "film" | "serie" }) =>
      // `GET /titles/tmdb/:tmdbId` déclenche un import complet (credits inclus)
      // côté serveur, potentiellement long — le timeout par défaut de 10s
      // d'apiFetch abortait la requête avant la fin (même cause que le bug
      // #27 sur le refresh de filmographie).
      apiFetch<{ id: string }>(
        `/titles/tmdb/${encodeURIComponent(tmdbId)}?type=${encodeURIComponent(type)}`,
        { timeoutMs: 120_000 },
      ),
    onSuccess: () => {
      // Les cartes du résultat de recherche concerné passeront "local" au
      // prochain fetch (le titre existe désormais en base).
      queryClient.invalidateQueries({ queryKey: ["search"], exact: false });
    },
  });
}

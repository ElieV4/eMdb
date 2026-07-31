/**
 * Hook utilitaire qui dérive, à partir de useLists(), les Sets de title_ids
 * présents dans la watchlist et dans les favoris de l'utilisateur. Utilisé
 * pour afficher les icones watchlist/favori sur les affiches (bug #45).
 *
 * Réutilise le cache React Query de useLists() (déjà chargé par le header et
 * de nombreuses pages) plutôt que de refaire un appel dédié.
 */

import { useMemo } from "react";
import { useAuthStore } from "@/store/authStore";
import { useLists } from "./useLists";

export function useListMembership() {
  const { isAuthenticated } = useAuthStore();
  const { data: lists, isLoading } = useLists(isAuthenticated);

  const watchlistIds = useMemo(() => {
    const watchlist = lists?.find((list) => list.type === "watchlist");
    return new Set((watchlist?.items ?? []).map((item) => item.titleId));
  }, [lists]);

  const favoriteIds = useMemo(() => {
    const favoris = lists?.find((list) => list.type === "favoris");
    return new Set((favoris?.items ?? []).map((item) => item.titleId));
  }, [lists]);

  return { watchlistIds, favoriteIds, isLoading };
}

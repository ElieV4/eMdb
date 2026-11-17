/**
 * Page watchlist : redirige vers la page de la liste watchlist
 * (/lists/:id), qui gère déjà ses spécificités (filtre de progression,
 * statuts) et partage avec toutes les listes la barre d'outils (recherche,
 * vue affiches / tableau, ajout rapide, modifier le contenu).
 * Route : /watchlist — conservée pour les liens existants.
 */

"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useLists } from "@/hooks/api/useLists";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

function WatchlistRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthStore();
  const { data: lists, isLoading } = useLists(isAuthenticated);
  const watchlistId = lists?.find((list) => list.type === "watchlist")?.id;

  useEffect(() => {
    if (watchlistId) {
      const qs = searchParams.toString();
      router.replace(`/lists/${watchlistId}${qs ? `?${qs}` : ""}`);
    }
  }, [watchlistId, router, searchParams]);

  if (!isAuthLoading && !isAuthenticated) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-2xl font-bold">Watchlist</h1>
        <p className="mt-2 text-sm text-muted-foreground">Connectez-vous pour voir votre watchlist.</p>
      </div>
    );
  }

  if (!isLoading && lists && !watchlistId) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-2xl font-bold">Watchlist</h1>
        <p className="mt-2 text-sm text-muted-foreground">Watchlist introuvable.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-12">
      <LoadingSpinner className="mx-auto" />
    </div>
  );
}

export default function WatchlistPage() {
  return (
    <Suspense fallback={null}>
      <WatchlistRedirect />
    </Suspense>
  );
}

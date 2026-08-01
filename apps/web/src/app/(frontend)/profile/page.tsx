"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { User, Star, Bell, BarChart3, LogOut } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useLogout } from "@/hooks/auth/useLogout";
import { useLists } from "@/hooks/api";
import { useList } from "@/hooks/api/useList";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TitleCard } from "@/components/titles/TitleCard";
import { useWatchedTitles, useListMembership } from "@/hooks/api";
import { DatavizSection } from "@/components/dataviz/DatavizSection";
import { AdminRefreshButton } from "@/components/admin/AdminRefreshButton";
import {
  parseTitleFilters,
  titleMatchesFilters,
  toFilterableTitle,
  buildListIdsByTitle,
} from "@/lib/titleFilters";

export default function ProfilePage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const logout = useLogout();
  const searchParams = useSearchParams();
  const filters = parseTitleFilters(searchParams);

  // Modification O : l'icône profil (avec son dropdown Profil/Déconnexion)
  // a été retirée du header — la déconnexion se fait désormais depuis ce
  // bouton dédié, en haut à droite de la page Profil.
  useEffect(() => {
    if (logout.isSuccess) {
      router.push("/login");
    }
  }, [logout.isSuccess, router]);

  // Nécessaire uniquement pour repérer la liste favoris ci-dessous — le
  // module "Mes Listes" a été retiré du profil, les listes ont leur propre
  // page dédiée (`/lists`).
  const { data: lists } = useLists(isAuthenticated);
  const { data: watchedTitles } = useWatchedTitles();
  const { watchlistIds, favoriteIds } = useListMembership();

  const favorisId = lists?.find((list) => list.type === "favoris")?.id;
  // GET /lists ne renvoie pas les titres au format affichable — on récupère
  // le détail de la liste favoris pour avoir ses items complets.
  const { data: favorisDetail } = useList(favorisId ?? "");
  const listIdsByTitle = buildListIdsByTitle(lists);
  // Filtres du header (modification O) : les items de la liste favoris
  // portent déjà genres/pays/année/note en toutes lettres (GET /lists/:id),
  // donc contrairement aux modules "Découvrir"/"Titres recommandés", tous
  // les filtres s'appliquent ici sans restriction.
  const favoritesItems = (favorisDetail?.items ?? []).filter((title) =>
    titleMatchesFilters(
      toFilterableTitle(title, { watchedTitleIds: watchedTitles, listIdsByTitle }),
      filters,
    ),
  );

  if (!isAuthenticated || !user) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Profil</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Veuillez vous connecter pour voir votre profil.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="space-y-10">
        {/* En-tête profil */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-primary/10 p-4">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{user.pseudo}</h1>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Déconnexion
          </Button>
        </div>

        {/* Favoris */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Mes Favoris
          </h2>
          {favoritesItems.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              {favorisDetail && (favorisDetail.items?.length ?? 0) > 0
                ? "Aucun favori ne correspond aux filtres actifs."
                : "Vous n'avez pas encore de favoris."}
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {favoritesItems.map((title) => (
                <TitleCard
                  key={title.id}
                  title={{ ...title, local: true }}
                  compact
                  watched={watchedTitles?.has(title.id)}
                  inWatchlist={watchlistIds.has(title.id)}
                  inFavorites={favoriteIds.has(title.id)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Dataviz */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Statistiques de visionnage
            </h2>
            <AdminRefreshButton />
          </div>
          <DatavizSection />
        </section>

        {/* Notifications */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Notifications
          </h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-4 rounded-lg border">
              <div className="rounded-full bg-primary/10 p-2">
                <Bell className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Nouvel épisode disponible</p>
                <p className="text-xs text-muted-foreground">
                  Une série que vous suivez a un nouvel épisode.
                </p>
              </div>
              <Badge variant="secondary">Récent</Badge>
            </div>
          </div>
          <div className="mt-4 p-8 border-2 border-dashed rounded-lg text-center text-muted-foreground">
            <Bell className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>
              La gestion complète des notifications sera disponible
              prochainement.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

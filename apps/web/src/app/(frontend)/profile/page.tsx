"use client";

import { User, Star, Bell, BarChart3 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useLists } from "@/hooks/api";
import { useList } from "@/hooks/api/useList";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TitleCard } from "@/components/titles/TitleCard";
import { useWatchedTitles, useFollowedTitleIds } from "@/hooks/api";

export default function ProfilePage() {
  const { user, isAuthenticated } = useAuthStore();

  // Nécessaire uniquement pour repérer la liste favoris ci-dessous — le
  // module "Mes Listes" a été retiré du profil, les listes ont leur propre
  // page dédiée (`/lists`).
  const { data: lists } = useLists(isAuthenticated);
  const { data: watchedTitles } = useWatchedTitles();
  const { data: followedTitleIds } = useFollowedTitleIds();

  const favorisId = lists?.find((list) => list.type === "favoris")?.id;
  // GET /lists ne renvoie pas les titres au format affichable — on récupère
  // le détail de la liste favoris pour avoir ses items complets.
  const { data: favorisDetail } = useList(favorisId ?? "");
  const favoritesItems = favorisDetail?.items ?? [];

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
        <div className="flex items-center gap-4">
          <div className="rounded-full bg-primary/10 p-4">
            <User className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{user.pseudo}</h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>

        {/* Favoris */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Mes Favoris
          </h2>
          {favoritesItems.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              Vous n&apos;avez pas encore de favoris.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {favoritesItems.map((title) => (
                <TitleCard
                  key={title.id}
                  title={{ ...title, local: true }}
                  compact
                  watched={watchedTitles?.has(title.id)}
                  followed={followedTitleIds?.has(title.id)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Dataviz */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Statistiques de visionnage
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">Films vus</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">Épisodes vus</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">0h</div>
                <p className="text-xs text-muted-foreground">Temps total</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">Notes données</p>
              </CardContent>
            </Card>
          </div>
          <div className="mt-6 p-8 border-2 border-dashed rounded-lg text-center text-muted-foreground">
            <BarChart3 className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>Les graphiques détaillés seront disponibles prochainement.</p>
          </div>
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
                <p className="text-sm font-medium">
                  Nouvel épisode disponible
                </p>
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

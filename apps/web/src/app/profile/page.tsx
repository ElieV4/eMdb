"use client";

import { useState } from "react";
import { User, Star, List, Bell, BarChart3 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useLists } from "@/hooks/api";
import { ListCard } from "@/components/lists/ListCard";
import { ListDialog } from "@/components/lists/ListDialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Plus } from "lucide-react";
import { TitleCard } from "@/components/titles/TitleCard";
import { UserList } from "@/lib/types/api";

type ProfileTab = "favorites" | "lists" | "dataviz" | "notifications";

export default function ProfilePage() {
  const { user, isAuthenticated } = useAuthStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>("favorites");

  const { data: lists, isLoading: isLoadingLists, error: listsError } = useLists(isAuthenticated);

  const watchlist = lists?.find((list) => list.type === "watchlist");
  const favorites = lists?.find((list) => list.type === "favoris");
  const customLists = lists?.filter((list) => list.type === "custom") ?? [];

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
      <div className="space-y-8">
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

        {/* Onglets */}
        <div className="flex gap-2 border-b">
          {[
            { id: "favorites", label: "Favoris", icon: Star },
            { id: "lists", label: "Listes", icon: List },
            { id: "dataviz", label: "Dataviz", icon: BarChart3 },
            { id: "notifications", label: "Notifications", icon: Bell },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ProfileTab)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Favoris */}
        {activeTab === "favorites" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Mes Favoris
            </h2>
            {!favorites || !favorites.items || favorites.items.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                Vous n&apos;avez pas encore de favoris.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {favorites.items.map((title) => (
                  <TitleCard
                    key={title.id}
                    title={title}
                    compact
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Gestion des listes */}
        {activeTab === "lists" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Mes Listes</h2>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Créer une liste
              </Button>
            </div>

            {isLoadingLists ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-48 w-full" />
                ))}
              </div>
            ) : listsError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Erreur lors du chargement des listes.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {lists?.map((list) => (
                  <ListCard key={list.id} list={list} />
                ))}
              </div>
            )}

            <ListDialog open={dialogOpen} onOpenChange={setDialogOpen} />
          </div>
        )}

        {/* Dataviz */}
        {activeTab === "dataviz" && (
          <div className="space-y-4">
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
          </div>
        )}

        {/* Notifications */}
        {activeTab === "notifications" && (
          <div className="space-y-4">
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
              <p>La gestion complète des notifications sera disponible prochainement.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

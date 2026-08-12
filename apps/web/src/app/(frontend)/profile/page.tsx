"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, Bell, BarChart3, LogOut, Upload, Settings } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useLogout } from "@/hooks/auth/useLogout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DatavizSection } from "@/components/dataviz/DatavizSection";
import { AdminRefreshButton } from "@/components/admin/AdminRefreshButton";
import { TraktImportButton } from "@/components/profile/TraktImportButton";
import { ImportCreditsButton } from "@/components/profile/ImportCreditsButton";

export default function ProfilePage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const logout = useLogout();

  // Modification O : l'icône profil (avec son dropdown Profil/Déconnexion)
  // a été retirée du header — la déconnexion se fait désormais depuis ce
  // bouton dédié, en haut à droite de la page Profil.
  useEffect(() => {
    if (logout.isSuccess) {
      router.push("/login");
    }
  }, [logout.isSuccess, router]);

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
          <div className="flex items-center gap-2">
            <Link href="/settings">
              <Button variant="outline">
                <Settings className="mr-2 h-4 w-4" />
                Paramètres
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Déconnexion
            </Button>
          </div>
        </div>

        {/* Dataviz (modification W : placé avant Favoris ; module Favoris
            retiré de cette page ensuite, retour utilisateur) */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Temps d&apos;écran
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

        {/* Import Trakt (bug #55/#56) */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Import
          </h2>
          <p className="text-sm text-muted-foreground">
            Importez votre historique de visionnage, vos notes et votre
            watchlist depuis un export Trakt (.zip).
          </p>
          <div className="flex flex-wrap gap-2">
            <TraktImportButton />
            <ImportCreditsButton />
          </div>
        </section>
      </div>
    </div>
  );
}

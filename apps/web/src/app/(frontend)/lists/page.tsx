/**
 * Page de gestion des listes de l'utilisateur.
 * Route : /lists
 * Backend : GET /lists, POST /lists
 *
 * Phase 4.3 — Lists
 */

"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Plus } from "lucide-react";
import { ListCard } from "@/components/lists/ListCard";
import { ListDialog } from "@/components/lists/ListDialog";
import { useLists } from "@/hooks/api/useLists";
import { useAuthStore } from "@/store/authStore";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import {
  parseTitleFilters,
  hasActiveTitleFilters,
  titleMatchesFilters,
} from "@/lib/titleFilters";

export default function ListsPage() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const searchParams = useSearchParams();
  const filters = parseTitleFilters(searchParams);

  const { data: lists, isLoading, error } = useLists(isAuthenticated);

  // Une liste "correspond" aux filtres actifs si au moins un de ses titres y
  // correspond (bug filtres header sur accueil/watchlist/listes/historique).
  const filteredLists = hasActiveTitleFilters(filters)
    ? lists?.filter((list) =>
        (list.items ?? []).some((item) => titleMatchesFilters(item, filters)),
      )
    : lists;

  if (isAuthLoading) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-12">
        <LoadingSpinner className="mx-auto" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-2xl font-bold">Mes Listes</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Connectez-vous pour gérer vos listes.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Mes Listes</h1>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Créer une liste
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Erreur lors du chargement des listes.
            </AlertDescription>
          </Alert>
        ) : filteredLists?.length === 0 && (lists?.length ?? 0) > 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune liste ne correspond aux filtres actifs.
          </p>
        ) : filteredLists?.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Vous n&apos;avez pas encore de liste.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredLists?.map((list) => (
              <ListCard key={list.id} list={list} />
            ))}
          </div>
        )}

        <ListDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      </div>
    </div>
  );
}

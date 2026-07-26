"use client";

/**
 * Page des listes de l'utilisateur.
 *
 * Phase 4.3 — Lists
 */

import { useLists, useSharedLists } from "@/hooks/api";
import { ListCard } from "@/components/lists/ListCard";
import { ListDialog } from "@/components/lists/ListDialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Plus } from "lucide-react";
import { useState } from "react";

type ListsTab = "my-lists" | "shared";

export default function ListsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tab, setTab] = useState<ListsTab>("my-lists");
  const { data: lists, isLoading, error } = useLists();
  const { data: sharedLists } = useSharedLists() as { data: Array<any> | undefined };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Mes listes</h1>
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">Mes listes</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Erreur lors du chargement des listes.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Mes listes</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Créer une liste
        </Button>
      </div>

      <div className="flex items-center gap-2 border-b mb-6">
        <button
          type="button"
          onClick={() => setTab("my-lists")}
          className={`px-3 py-2 text-sm ${tab === "my-lists" ? "border-b-2 border-primary font-semibold" : "text-muted-foreground"}`}
        >
          Mes listes
        </button>
        <button
          type="button"
          onClick={() => setTab("shared")}
          className={`px-3 py-2 text-sm ${tab === "shared" ? "border-b-2 border-primary font-semibold" : "text-muted-foreground"}`}
        >
          Partagées avec moi
          {sharedLists && sharedLists.length > 0 && (
            <span className="ml-2 rounded-full bg-primary text-primary-foreground text-xs px-1.5 py-0.5">
              {sharedLists.length}
            </span>
          )}
        </button>
      </div>

      {tab === "my-lists" ? (
        !lists || lists.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">
            Vous n'avez pas encore de listes.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {lists.map((list) => (
              <ListCard key={list.id} list={list} />
            ))}
          </div>
        )
      ) : !sharedLists || sharedLists.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">
          Aucune liste partagée avec vous.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {sharedLists.map((list) => (
            <ListCard key={list.id} list={list} />
          ))}
        </div>
      )}

      <ListDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
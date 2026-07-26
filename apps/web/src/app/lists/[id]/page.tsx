/**
 * Page de détail d'une liste.
 *
 * Phase 4.3 — Lists
 */

"use client";

import { useList } from "@/hooks/api/useList";
import { ListItemsGrid } from "@/components/lists/ListItemsGrid";
import { ListReorder } from "@/components/lists/ListReorder";
import { ListShareDialog } from "@/components/lists/ListShareDialog";
import { useRemoveItem } from "@/hooks/api/useRemoveItem";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Share2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";

export default function ListDetailPage() {
  const params = useParams();
  const listId = params.id as string;
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showReorder, setShowReorder] = useState(false);
  const removeItem = useRemoveItem();

  const { data: list, isLoading, error } = useList(listId);

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <Skeleton className="h-8 w-64 mb-6" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !list) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Liste introuvable.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleRemoveItem = async (titleId: string) => {
    await removeItem.mutateAsync({ listId, titleId });
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">{list.nom}</h1>
          {list.description && (
            <p className="text-muted-foreground mt-1">{list.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowShareDialog(true)}>
            <Share2 className="mr-2 h-4 w-4" />
            Partager
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowReorder(!showReorder)}
          >
            {showReorder ? "Vue normale" : "Réorganiser"}
          </Button>
        </div>
      </div>

      {showReorder ? (
        <ListReorder
          items={list.items || []}
          onSuccess={() => setShowReorder(false)}
        />
      ) : (
        <ListItemsGrid
          items={list.items || []}
          onRemove={handleRemoveItem}
          canEdit={true}
        />
      )}

      <ListShareDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        listId={listId}
        listName={list.nom}
      />
    </div>
  );
}
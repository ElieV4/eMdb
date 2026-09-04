/**
 * Bouton de rafraîchissement des vues matérialisées (Phase 6.2).
 *
 * Visible uniquement si l'utilisateur connecté est admin (cf. useIsAdmin).
 * Appelle POST /admin/refresh-materialized-views et affiche le jobId + statut.
 */

"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsAdmin } from "@/hooks/api/useIsAdmin";
import {
  useRefreshMaterializedViews,
  type RefreshMaterializedViewsResult,
} from "@/hooks/api/useRefreshMaterializedViews";

export function AdminRefreshButton() {
  const { isAdmin, isLoading: isLoadingAdmin } = useIsAdmin();
  const [result, setResult] = useState<RefreshMaterializedViewsResult | null>(
    null,
  );
  const mutation = useRefreshMaterializedViews();

  if (isLoadingAdmin || !isAdmin) return null;

  function handleRefresh() {
    setResult(null);
    mutation.mutate(undefined, {
      onSuccess: (data) => setResult(data),
    });
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleRefresh}
        disabled={mutation.isPending}
      >
        <RefreshCw className={mutation.isPending ? "animate-spin" : ""} />
        {mutation.isPending ? "Rafraîchissement..." : "Rafraîchir les données"}
      </Button>

      {mutation.isError && (
        <p className="text-xs text-destructive">
          Échec du rafraîchissement. Vérifiez que vous êtes administrateur.
        </p>
      )}

      {result && (
        <p className="text-xs text-muted-foreground">
          {result.message}
          {result.jobId ? ` — Job #${result.jobId}` : ""}
        </p>
      )}
    </div>
  );
}

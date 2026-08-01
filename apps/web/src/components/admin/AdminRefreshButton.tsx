/**
 * Bouton de rafraîchissement des vues matérialisées (Phase 6.2).
 *
 * Visible uniquement si l'utilisateur connecté fait partie des ADMIN_EMAILS.
 * Appelle POST /admin/refresh-materialized-views et affiche le jobId + statut.
 */

"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";
import {
  useRefreshMaterializedViews,
  type RefreshMaterializedViewsResult,
} from "@/hooks/api/useRefreshMaterializedViews";

const ADMIN_EMAILS = (
  process.env.NEXT_PUBLIC_ADMIN_EMAILS ??
  process.env.ADMIN_EMAILS ??
  ""
)
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export function AdminRefreshButton() {
  const { user } = useAuthStore();
  const [result, setResult] = useState<RefreshMaterializedViewsResult | null>(
    null,
  );
  const mutation = useRefreshMaterializedViews();

  const isAdmin =
    !!user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase());

  if (!isAdmin) return null;

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

/**
 * Module "Demandes de compte" — visible uniquement par l'administrateur
 * (cf. useIsAdmin). Liste les inscriptions en attente de validation
 * (users.status = 'pending') et permet de les approuver/refuser.
 */

"use client";

import { useIsAdmin } from "@/hooks/api/useIsAdmin";
import { useAccountRequests } from "@/hooks/api/useAccountRequests";
import { useApproveAccountRequest } from "@/hooks/api/useApproveAccountRequest";
import { useRejectAccountRequest } from "@/hooks/api/useRejectAccountRequest";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AccountRequestsSection() {
  const { isAdmin, isLoading: isLoadingAdmin } = useIsAdmin();

  const { data: requests, isLoading } = useAccountRequests(isAdmin);
  const approve = useApproveAccountRequest();
  const reject = useRejectAccountRequest();

  if (isLoadingAdmin || !isAdmin) return null;

  const isBusy = (id: string) =>
    (approve.isPending && approve.variables === id) ||
    (reject.isPending && reject.variables === id);

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Demandes de compte</h2>
      <p className="text-sm text-muted-foreground">
        Nouvelles inscriptions en attente de validation avant activation.
      </p>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Chargement...</p>
      )}

      {!isLoading && (requests?.length ?? 0) === 0 && (
        <p className="text-sm text-muted-foreground">
          Aucune demande en attente.
        </p>
      )}

      {!isLoading && requests && requests.length > 0 && (
        <ul className="space-y-2">
          {requests.map((req) => (
            <li
              key={req.id}
              className="flex items-center justify-between gap-3 rounded-lg border p-3"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{req.pseudo}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {req.email} — {formatDate(req.created_at)}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isBusy(req.id)}
                  onClick={() => approve.mutate(req.id)}
                >
                  <Check className="h-4 w-4" />
                  Approuver
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={isBusy(req.id)}
                  onClick={() => reject.mutate(req.id)}
                >
                  <X className="h-4 w-4" />
                  Refuser
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Hook API pour la liste des demandes de création de compte en attente.
 * GET /admin/account-requests — réservé aux administrateurs.
 */

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";

export type AccountRequest = {
  id: string;
  email: string;
  pseudo: string;
  created_at: string;
};

export function useAccountRequests(enabled: boolean) {
  return useQuery({
    queryKey: ["admin", "account-requests"],
    queryFn: () => apiFetch<AccountRequest[]>("/admin/account-requests"),
    enabled,
  });
}

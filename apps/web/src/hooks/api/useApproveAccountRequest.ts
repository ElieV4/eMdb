/**
 * Hook API pour approuver une demande de création de compte.
 * POST /admin/account-requests/:id/approve — réservé aux administrateurs.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";

export function useApproveAccountRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) =>
      apiFetch(`/admin/account-requests/${userId}/approve`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "account-requests"] });
    },
  });
}

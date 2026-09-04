/**
 * Hook API pour refuser une demande de création de compte.
 * POST /admin/account-requests/:id/reject — réservé aux administrateurs.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";

export function useRejectAccountRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) =>
      apiFetch(`/admin/account-requests/${userId}/reject`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "account-requests"] });
    },
  });
}

/**
 * Hook API pour supprimer le compte de l'utilisateur connecté
 * (DELETE /users/me) — toutes les données associées sont supprimées en
 * cascade côté base (ON DELETE CASCADE).
 */

import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";

export function useDeleteAccount() {
  return useMutation({
    mutationFn: () => apiFetch("/users/me", { method: "DELETE" }),
  });
}

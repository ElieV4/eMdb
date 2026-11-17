/**
 * Mot de passe oublié : POST /auth/forgot-password. L'API répond le même
 * message que l'email existe ou non (pas d'énumération des comptes).
 */

import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) =>
      apiFetch<{ message: string }>("/auth/forgot-password", {
        method: "POST",
        body: { email },
      }),
  });
}

/** Nouveau mot de passe depuis le lien reçu par email : POST /auth/reset-password. */

import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";

export type ResetPasswordInput = {
  token: string;
  password: string;
};

export function useResetPassword() {
  return useMutation({
    mutationFn: (input: ResetPasswordInput) =>
      apiFetch<{ message: string }>("/auth/reset-password", {
        method: "POST",
        body: input,
      }),
  });
}

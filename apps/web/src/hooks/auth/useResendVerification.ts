/** Renvoi du lien de confirmation d'email : POST /auth/resend-verification. */

import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";

export function useResendVerification() {
  return useMutation({
    mutationFn: (email: string) =>
      apiFetch<{ message: string }>("/auth/resend-verification", {
        method: "POST",
        body: { email },
      }),
  });
}

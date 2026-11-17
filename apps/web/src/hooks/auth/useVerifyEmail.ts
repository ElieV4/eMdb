/**
 * Confirmation de l'adresse email (lien reçu après inscription) :
 * POST /auth/verify-email. Query plutôt que mutation déclenchée dans un
 * effet : React Query dédoublonne l'appel (StrictMode monte deux fois en
 * dev), sinon le 2e appel répondrait "déjà confirmée" à la place du succès.
 */

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";

export function useVerifyEmail(token: string | undefined) {
  return useQuery({
    queryKey: ["auth", "verify-email", token],
    queryFn: () =>
      apiFetch<{ message: string }>("/auth/verify-email", {
        method: "POST",
        body: { token },
      }),
    enabled: !!token,
    retry: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

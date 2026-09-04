/**
 * Statut admin de l'utilisateur connecté — déterminé par le backend
 * (AdminGuard sur GET /admin/worker/status : succès = admin, 401/403 =
 * non-admin), pas par une liste d'emails dupliquée côté client.
 *
 * Corrige un bug où les 3 panneaux admin (WorkerSection,
 * AccountRequestsSection, AdminRefreshButton) se basaient sur
 * NEXT_PUBLIC_ADMIN_EMAILS — jamais renseignée sur le déploiement Vercel
 * (seule ADMIN_EMAILS, backend, l'était), donc ces panneaux ne
 * s'affichaient jamais en prod quel que soit l'utilisateur connecté.
 * Expose aussi publiquement l'email admin dans le bundle JS, ce que cette
 * approche évite.
 */

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";
import { useAuthStore } from "@/store/authStore";

export function useIsAdmin() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const query = useQuery({
    queryKey: ["admin", "is-admin"],
    queryFn: () => apiFetch("/admin/worker/status"),
    enabled: isAuthenticated,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  return {
    isAdmin: query.isSuccess,
    isLoading: isAuthenticated && query.isLoading,
  };
}

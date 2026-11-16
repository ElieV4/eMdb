/**
 * Hook API de recherche d'utilisateurs pour le partage de listes
 * (GET /users/search?query=).
 *
 * L'API cherche par fragment de pseudo (2 caractères min.) ou par email
 * exact, et ne renvoie jamais d'email.
 */

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";
import { PublicUser } from "@/lib/types/api";

export function useSearchUsers(query: string) {
  const trimmed = query.trim();
  const enabled = trimmed.includes("@") || trimmed.length >= 2;

  return useQuery<PublicUser[]>({
    queryKey: ["users-search", trimmed],
    queryFn: () =>
      apiFetch<PublicUser[]>(`/users/search?query=${encodeURIComponent(trimmed)}`),
    enabled,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook API pour suivre une personne (POST /people/:id/follow).
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";

export function useFollowPerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (personId: string) =>
      apiFetch(`/people/${personId}/follow`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["people", "followed"] });
    },
  });
}

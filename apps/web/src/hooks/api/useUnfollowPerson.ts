/**
 * Hook API pour ne plus suivre une personne (DELETE /people/:id/follow).
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";

export function useUnfollowPerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (personId: string) =>
      apiFetch(`/people/${personId}/follow`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["people", "followed"] });
    },
  });
}

/**
 * Hook API pour modifier le contexte de visionnage d'un watch existant
 * (PATCH /watches/:id) — support/compagnie/émotion, saisis a posteriori.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";
import { WatchContextUpdateInput } from "@/lib/types/api";

export function useUpdateWatchContext() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ watchId, data }: { watchId: string; data: WatchContextUpdateInput }) =>
      apiFetch(`/watches/${watchId}`, {
        method: "PATCH",
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watches"], exact: false });
    },
  });
}

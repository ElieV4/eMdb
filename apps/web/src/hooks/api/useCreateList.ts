/**
 * Hook API pour créer une liste (POST /lists).
 * Phase 4.3 — Lists
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";
import { ListCreateInput } from "@/lib/types/api";

export function useCreateList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ListCreateInput) =>
      apiFetch("/lists", {
        method: "POST",
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lists"] });
      queryClient.invalidateQueries({ queryKey: ["shared-lists"] });
    },
  });
}

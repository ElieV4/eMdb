/**
 * Statut et pilotage du worker BullMQ embarqué (admin uniquement).
 * GET /admin/worker/status, POST /admin/worker/pause, POST /admin/worker/resume
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";

export type WorkerStatus = {
  embedEnabled: boolean;
  running: boolean;
  paused: boolean;
};

const WORKER_STATUS_KEY = ["admin", "worker-status"];

export function useWorkerStatus() {
  return useQuery({
    queryKey: WORKER_STATUS_KEY,
    queryFn: () => apiFetch<WorkerStatus>("/admin/worker/status"),
    staleTime: 30 * 1000,
  });
}

export function useToggleWorker() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (action: "pause" | "resume") =>
      apiFetch<WorkerStatus>(`/admin/worker/${action}`, { method: "POST" }),
    onSuccess: (data) => {
      queryClient.setQueryData(WORKER_STATUS_KEY, data);
    },
  });
}

/**
 * Hooks API pour la cloche de notifications (Header).
 * GET /notifications, GET /notifications/unread-count — authentifié.
 */

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";

export type NotificationItem = {
  id: string;
  type: string;
  message: string | null;
  lu: boolean;
  created_at: string;
  episode: { id: string; numero: number; titre: string | null; seasons: { numero: number } } | null;
  relatedUser: { id: string; pseudo: string; email: string } | null;
};

export type NotificationsListResponse = {
  data: NotificationItem[];
  total: number;
  page: number;
  limit: number;
};

export function useNotifications(enabled: boolean) {
  return useQuery({
    queryKey: ["notifications", "list"],
    queryFn: () => apiFetch<NotificationsListResponse>("/notifications?limit=20"),
    enabled,
    refetchInterval: 30_000,
  });
}

export function useUnreadNotificationsCount(enabled: boolean) {
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: () => apiFetch<{ count: number }>("/notifications/unread-count"),
    enabled,
    refetchInterval: 30_000,
  });
}

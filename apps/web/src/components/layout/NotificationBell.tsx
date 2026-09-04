/**
 * Cloche de notifications du Header — authentifié uniquement.
 * Affiche le compteur de non-lues (GET /notifications/unread-count) et un
 * menu déroulant avec les notifications récentes (GET /notifications).
 * Couvre à la fois les notifs génériques (account_request/account_login,
 * champ `message`) et les anciennes notifs d'épisodes (pas de `message`,
 * texte reconstruit depuis `episode`).
 */

"use client";

import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/auth/useAuth";
import {
  useNotifications,
  useUnreadNotificationsCount,
  type NotificationItem,
} from "@/hooks/api/useNotifications";
import { useMarkNotificationRead } from "@/hooks/api/useMarkNotificationRead";
import { cn } from "@/lib/utils";

function notificationText(n: NotificationItem): string {
  if (n.message) return n.message;
  if (n.type === "new_episode" && n.episode) {
    return `Nouvel épisode : S${n.episode.seasons.numero}E${n.episode.numero}${
      n.episode.titre ? ` — ${n.episode.titre}` : ""
    }`;
  }
  if (n.type === "season_premiere") return "Une nouvelle saison est disponible.";
  return "Nouvelle notification.";
}

function formatRelativeDate(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH} h`;
  const diffJ = Math.round(diffH / 24);
  return `il y a ${diffJ} j`;
}

export function NotificationBell() {
  const { isAuthenticated } = useAuth();
  const { data: unread } = useUnreadNotificationsCount(isAuthenticated);
  const { data: list } = useNotifications(isAuthenticated);
  const markRead = useMarkNotificationRead();

  if (!isAuthenticated) return null;

  const unreadCount = unread?.count ?? 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="relative flex items-center justify-center rounded-full p-2 text-primary hover:bg-muted transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -right-0.5 -top-0.5 h-4 min-w-4 px-1 text-[10px] leading-none"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </Badge>
            )}
          </button>
        }
      />
      <DropdownMenuContent align="end" className="w-80">
        <div className="px-1.5 py-1 text-xs font-medium text-muted-foreground">Notifications</div>
        {(!list || list.data.length === 0) && (
          <p className="px-1.5 py-2 text-sm text-muted-foreground">Aucune notification.</p>
        )}
        {list?.data.map((n) => (
          <DropdownMenuItem
            key={n.id}
            className={cn(
              "flex-col items-start gap-0.5 whitespace-normal focus:bg-muted focus:text-foreground",
              !n.lu && "bg-accent/50",
            )}
            onClick={() => {
              if (!n.lu) markRead.mutate(n.id);
            }}
          >
            <span className="text-sm">{notificationText(n)}</span>
            <span className="text-xs text-muted-foreground">{formatRelativeDate(n.created_at)}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

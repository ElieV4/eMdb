/**
 * Page calendrier : épisodes non vus des séries suivies.
 * Route : /calendar
 * Backend : GET /calendar
 *
 * Phase 4.1 — Watches
 */

"use client";

import { useAuthStore } from "@/store/authStore";
import { CalendarEpisodes } from "@/components/watches/CalendarEpisodes";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

export default function CalendarPage() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-12">
        <LoadingSpinner className="mx-auto" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-2xl font-bold">Calendrier</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Connectez-vous pour voir vos épisodes à venir.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Calendrier</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Épisodes à venir de vos séries suivies
          </p>
        </div>
        <CalendarEpisodes />
      </div>
    </div>
  );
}

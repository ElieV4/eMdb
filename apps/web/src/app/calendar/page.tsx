'use client';

import { Calendar } from 'lucide-react';
import { useCalendar } from '@/hooks/api/useCalendar';
import { CalendarEpisodes } from '@/components/watches/CalendarEpisodes';

export default function CalendarPage() {
  const { data, isLoading, error, refetch } = useCalendar();

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Calendar className="w-7 h-7 text-primary" />
          <h1 className="text-2xl font-bold">Calendrier des épisodes</h1>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-muted rounded" />
          <div className="h-24 bg-muted rounded" />
          <div className="h-24 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Calendar className="w-7 h-7 text-primary" />
          <h1 className="text-2xl font-bold">Calendrier des épisodes</h1>
        </div>
        <div className="p-4 rounded border border-destructive/40 bg-destructive/10 text-destructive">
          Impossible de charger le calendrier. Veuillez réessayer.
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Calendar className="w-7 h-7 text-primary" />
          <h1 className="text-2xl font-bold">Calendrier des épisodes</h1>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="px-3 py-1.5 text-sm border rounded hover:bg-muted"
        >
          Rafraîchir
        </button>
      </div>
      <CalendarEpisodes />
    </div>
  );
}
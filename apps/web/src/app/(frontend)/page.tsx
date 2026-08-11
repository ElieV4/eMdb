/**
 * Page d'accueil avec dashboard personnalisé.
 * Affiche du contenu différent selon si l'utilisateur est connecté ou non.
 * Correspondance backend : Phase 2 - Recherche & navigation
 */

"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Calendar, TrendingUp, Users } from "lucide-react";
import { TitleCard } from "@/components/titles/TitleCard";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { DateCardSlider, DateCardData } from "@/components/common/DateCardSlider";
import { CardSlider } from "@/components/common/CardSlider";
import { useAuthStore } from "@/store/authStore";
import {
  useRecentWatches,
  usePopularTitles,
  useRecommendations,
} from "@/hooks/api/useDashboard";
import { useCalendar } from "@/hooks/api/useCalendar";
import { useContinueWatching } from "@/hooks/api/useContinueWatching";
import { ContinueWatchingCard } from "@/components/watches/ContinueWatchingCard";
import { useLists } from "@/hooks/api/useLists";
import { useList } from "@/hooks/api/useList";
import { useWatchedTitles, useListMembership } from "@/hooks/api";
import {
  parseTitleFilters,
  titleMatchesFilters,
  toFilterableTitle,
  buildListIdsByTitle,
} from "@/lib/titleFilters";
import { Title, TitleSearchResult } from "@/lib/types/api";

// Convertir Title en TitleSearchResult pour compatibilité avec TitleCard
function titleToSearchResult(title: Title): TitleSearchResult {
  return {
    id: title.id,
    tmdbId: title.tmdbId,
    titre: title.titre,
    titreOriginal: title.titreOriginal,
    type: title.type,
    dateSortie: title.dateSortie,
    duree: title.duree,
    note: title.note,
    afficheUrl: title.afficheUrl,
    genres: title.genres,
    pays: title.pays,
    local: true,
  };
}

// Composant de section pour le dashboard
interface DashboardSectionProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionHref?: string;
  children: React.ReactNode;
  className?: string;
}

function DashboardSection({
  title,
  subtitle,
  actionLabel,
  actionHref,
  children,
  className,
}: DashboardSectionProps) {
  return (
    <section className={className}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        {actionLabel && actionHref && (
          <Link
            href={actionHref}
            className="text-sm text-primary hover:underline"
          >
            {actionLabel}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function HomePageContent() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthStore();
  const searchParams = useSearchParams();
  const filters = parseTitleFilters(searchParams);

  // Hooks pour les données du dashboard
  const { data: recentWatches } = useRecentWatches(30, isAuthenticated);

  const { data: popularTitles, isLoading: isLoadingPopular } =
    usePopularTitles(10);

  const { data: calendarEntries, isLoading: isLoadingCalendar } =
    useCalendar(isAuthenticated);

  const { data: continueWatching, isLoading: isLoadingContinueWatching } =
    useContinueWatching(isAuthenticated);

  const { data: recommendations, isLoading: isLoadingRecommendations } =
    useRecommendations(10);

  const { data: userLists } = useLists(isAuthenticated);
  const watchlistId = userLists?.find((list) => list.type === "watchlist")?.id;
  // GET /lists ne renvoie pas les titres au format affichable — on récupère
  // le détail de la liste watchlist pour avoir ses items complets.
  const { data: watchlistDetail } = useList(watchlistId ?? "");
  const { data: watchedTitles } = useWatchedTitles();
  const { watchlistIds, favoriteIds, watchlistStatuses } = useListMembership();

  const listIdsByTitle = buildListIdsByTitle(userLists);
  const watchlistItems = (watchlistDetail?.items ?? []).filter((item) =>
    titleMatchesFilters(
      toFilterableTitle(item, { watchedTitleIds: watchedTitles, listIdsByTitle }),
      filters,
    ),
  );

  // Filtres du header (modification O) : recommandations et titres
  // populaires viennent tous deux de la base locale (`Title[]`), donc
  // genres/pays/année/note sont disponibles — tous les filtres s'appliquent.
  const filteredRecommendations = (recommendations ?? []).filter((title) =>
    titleMatchesFilters(
      toFilterableTitle(title, { watchedTitleIds: watchedTitles, listIdsByTitle }),
      filters,
    ),
  );
  const filteredPopularTitles = (popularTitles ?? []).filter((title) =>
    titleMatchesFilters(
      toFilterableTitle(title, { watchedTitleIds: watchedTitles, listIdsByTitle }),
      filters,
    ),
  );

  // Filtre appliqué sur le type uniquement : les visionnages récents
  // n'embarquent pas les genres/pays/note du titre (donnée non disponible
  // sans changement backend plus large).
  const filteredRecentWatches = (recentWatches ?? []).filter((watch) => {
    if (filters.type === "tout") return true;
    return watch.titles?.type === filters.type;
  });

  const historyCards: DateCardData[] = filteredRecentWatches.map((watch) => ({
    key: watch.id,
    href: watch.episodes
      ? `/episodes/${watch.episodes.id}`
      : `/titles/${watch.title_id}`,
    imageUrl: watch.titles?.affiche_url,
    title:
      watch.titles?.titre_vf ||
      watch.titles?.titre_vo ||
      watch.episodes?.titre ||
      "Inconnu",
    subtitle: watch.episodes
      ? `Épisode ${watch.episodes.numero}`
      : watch.titles?.type === "serie"
        ? "Série"
        : "Film",
    date: watch.date_vue,
  }));

  const calendarCards: DateCardData[] = [...(calendarEntries ?? [])]
    .sort((a, b) => {
      const da = a.date_diffusion ? new Date(a.date_diffusion).getTime() : Infinity;
      const db = b.date_diffusion ? new Date(b.date_diffusion).getTime() : Infinity;
      return da - db;
    })
    .map((entry, idx) => ({
      key: `${entry.title_id}-${entry.saison}-${entry.episode_numero}-${idx}`,
      href: `/titles/${entry.title_id}`,
      imageUrl: entry.affiche_url,
      title: entry.titre_vf || entry.titre_vo,
      subtitle: `S${String(entry.saison).padStart(2, "0")}E${String(entry.episode_numero).padStart(2, "0")}${entry.episode_titre ? ` — ${entry.episode_titre}` : ""}`,
      date: entry.date_diffusion,
    }));

  // Si l'authentification est encore en cours de vérification
  if (isAuthLoading) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-12">
        <LoadingSpinner className="mx-auto" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      {/* En-tête (invités uniquement) */}
      {!isAuthenticated && (
        <div className="mb-12">
          <h1 className="text-3xl font-bold tracking-tight">
            Bienvenue sur eMDB
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Découvrez, suivez et partagez vos films et séries préférés.
          </p>

          <div className="mt-6 flex gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            >
              Créer un compte
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-input bg-background font-medium hover:bg-muted/50 transition-colors"
            >
              Se connecter
            </Link>
          </div>
        </div>
      )}

      {/* Dashboard pour utilisateurs connectés */}
      {isAuthenticated ? (
        <div className="space-y-10">
          {/* Continuer à regarder (modification U) */}
          {isLoadingContinueWatching ? (
            <DashboardSection title="Continuer à regarder">
              <div className="flex gap-4 overflow-hidden">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="shrink-0 w-32 sm:w-36 aspect-[2/3] rounded-lg bg-muted/50 animate-pulse"
                  />
                ))}
              </div>
            </DashboardSection>
          ) : (
            continueWatching &&
            continueWatching.length > 0 && (
              <DashboardSection
                title={`Continuer à regarder (${continueWatching.length})`}
                actionLabel={continueWatching.length > 10 ? "Voir plus" : undefined}
                actionHref={continueWatching.length > 10 ? "/continue-watching" : undefined}
              >
                <CardSlider
                  moreHref={continueWatching.length > 10 ? "/continue-watching" : undefined}
                >
                  {continueWatching.slice(0, 10).map((entry) => (
                    <ContinueWatchingCard
                      key={entry.title_id}
                      entry={entry}
                      inWatchlist={watchlistIds.has(entry.title_id)}
                      inFavorites={favoriteIds.has(entry.title_id)}
                      watchlistStatus={watchlistStatuses.get(entry.title_id)}
                    />
                  ))}
                </CardSlider>
              </DashboardSection>
            )
          )}

          {/* Watchlist — juste après "Continuer à regarder" (retour utilisateur) */}
          <DashboardSection
            title={`Watchlist (${watchlistItems.length})`}
            subtitle="Films et séries à voir"
            actionLabel={
              watchlistItems.length > 0 ? "Voir la watchlist" : undefined
            }
            actionHref={watchlistItems.length > 0 ? `/watchlist` : undefined}
          >
            {watchlistItems.length > 0 ? (
              <CardSlider moreHref={watchlistItems.length > 10 ? "/watchlist" : undefined}>
                {watchlistItems.slice(0, 10).map((title) => (
                  <TitleCard
                    key={title.id}
                    title={titleToSearchResult(title)}
                    compact
                    className="shrink-0"
                    watched={watchedTitles?.has(title.id)}
                    inWatchlist={watchlistIds.has(title.id)}
                    inFavorites={favoriteIds.has(title.id)}
                  />
                ))}
              </CardSlider>
            ) : (
              <p className="text-sm text-muted-foreground py-4">
                Votre watchlist est vide. Ajoutez des titres à voir !
              </p>
            )}
          </DashboardSection>

          {/* Recommandés */}
          <DashboardSection
            title={`Recommandés (${filteredRecommendations.length})`}
            subtitle="Suggestions basées sur vos goûts"
            actionLabel="Voir plus"
            actionHref="/recommendations"
          >
            {isLoadingRecommendations ? (
              <div className="flex gap-4 overflow-hidden">
                {Array.from({ length: 6 }, (_, i) => (
                  <div
                    key={i}
                    className="shrink-0 w-[150px] aspect-[2/3] rounded-lg bg-muted/50 animate-pulse"
                  />
                ))}
              </div>
            ) : filteredRecommendations.length > 0 ? (
              <CardSlider moreHref={filteredRecommendations.length > 10 ? "/recommendations" : undefined}>
                {filteredRecommendations.slice(0, 10).map((title) => (
                  <TitleCard
                    key={title.id}
                    title={titleToSearchResult(title)}
                    compact
                    className="shrink-0"
                    watched={watchedTitles?.has(title.id)}
                    inWatchlist={watchlistIds.has(title.id)}
                    inFavorites={favoriteIds.has(title.id)}
                  />
                ))}
              </CardSlider>
            ) : (
              <p className="text-sm text-muted-foreground py-4">
                {recommendations && recommendations.length > 0
                  ? "Aucune recommandation ne correspond aux filtres actifs."
                  : "Commencez à noter des titres pour recevoir des recommandations."}
              </p>
            )}
          </DashboardSection>

          {/* Calendrier — en bas de page, juste au-dessus de Historique (retour utilisateur) */}
          <DashboardSection
            title={`Calendrier (${calendarCards.length})`}
            subtitle="Épisodes à venir de vos séries suivies"
            actionLabel="Voir le calendrier complet"
            actionHref="/calendar"
          >
            {isLoadingCalendar ? (
              <div className="flex gap-4 overflow-hidden">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="shrink-0 w-32 sm:w-36 aspect-[2/3] rounded-lg bg-muted/50 animate-pulse"
                  />
                ))}
              </div>
            ) : calendarCards.length > 0 ? (
              <DateCardSlider items={calendarCards} moreHref="/calendar" />
            ) : (
              <p className="text-sm text-muted-foreground py-4">
                Aucun épisode à venir pour le moment.
              </p>
            )}
          </DashboardSection>

          {/* Historique — sous Calendrier, tout en bas de page (retour utilisateur) */}
          {historyCards.length > 0 && (
            <DashboardSection
              title={`Historique (${historyCards.length})`}
              actionLabel="Voir tout l'historique"
              actionHref="/history"
            >
              <DateCardSlider items={historyCards} moreHref="/history" />
            </DashboardSection>
          )}
        </div>
      ) : (
        /* Dashboard pour invités */
        <div className="space-y-10">
          {/* Titres populaires */}
          <DashboardSection
            title="Titres populaires"
            subtitle="Découvrez les films et séries les plus appréciés"
            actionLabel="Voir plus"
            actionHref="/search"
          >
            {isLoadingPopular ? (
              <div className="flex gap-4 overflow-hidden">
                {Array.from({ length: 8 }, (_, i) => (
                  <div
                    key={i}
                    className="shrink-0 w-[150px] aspect-[2/3] rounded-lg bg-muted/50 animate-pulse"
                  />
                ))}
              </div>
            ) : filteredPopularTitles.length > 0 ? (
              <CardSlider moreHref="/search">
                {filteredPopularTitles.slice(0, 10).map((title) => (
                  <TitleCard
                    key={title.id}
                    title={titleToSearchResult(title)}
                    compact
                    className="shrink-0"
                    watched={watchedTitles?.has(title.id)}
                    inWatchlist={watchlistIds.has(title.id)}
                    inFavorites={favoriteIds.has(title.id)}
                  />
                ))}
              </CardSlider>
            ) : (
              <p className="text-sm text-muted-foreground py-4">
                {popularTitles && popularTitles.length > 0
                  ? "Aucun titre populaire ne correspond aux filtres actifs."
                  : "Aucun titre populaire trouvé."}
              </p>
            )}
          </DashboardSection>

          {/* Fonctionnalités */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-6 rounded-lg border bg-muted/30">
              <div className="rounded-full p-3 bg-primary/10 w-fit mb-4">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Découvrir</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Explorez une base de données complète de films et séries avec
                des informations détaillées.
              </p>
              <Link
                href="/search"
                className="text-sm text-primary hover:underline"
              >
                Commencer la recherche
              </Link>
            </div>

            <div className="p-6 rounded-lg border bg-muted/30">
              <div className="rounded-full p-3 bg-secondary/10 w-fit mb-4">
                <Calendar className="h-6 w-6 text-secondary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Suivre</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Créez un compte pour suivre vos séries préférées et être notifié
                des nouveaux épisodes.
              </p>
              <Link
                href="/register"
                className="text-sm text-primary hover:underline"
              >
                Créer un compte
              </Link>
            </div>

            <div className="p-6 rounded-lg border bg-muted/30">
              <div className="rounded-full p-3 bg-accent/10 w-fit mb-4">
                <Users className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Partager</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Partagez vos listes de films et séries avec vos amis et
                découvrez leurs recommandations.
              </p>
              <Link
                href="/register"
                className="text-sm text-primary hover:underline"
              >
                Rejoindre la communauté
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomePageContent />
    </Suspense>
  );
}

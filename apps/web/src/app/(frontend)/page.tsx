/**
 * Page d'accueil avec dashboard personnalisé.
 * Affiche du contenu différent selon si l'utilisateur est connecté ou non.
 * Correspondance backend : Phase 2 - Recherche & navigation
 */

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  PlayCircle,
  Star,
  List,
  Calendar,
  TrendingUp,
  Users,
} from "lucide-react";
import { TitleCard } from "@/components/titles/TitleCard";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { CalendarEpisodes } from "@/components/watches/CalendarEpisodes";
import { useAuthStore } from "@/store/authStore";
import {
  useRecentWatches,
  useFollowedSeries,
  usePopularTitles,
  useRecommendations,
} from "@/hooks/api/useDashboard";
import { useCalendar } from "@/hooks/api/useCalendar";
import { useLists } from "@/hooks/api/useLists";
import { useList } from "@/hooks/api/useList";
import { useWatchedTitles, useFollowedTitleIds } from "@/hooks/api";
import {
  parseTitleFilters,
  titleMatchesFilters,
  toFilterableTitle,
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

// Composant de card pour "Continue Watching"
function ContinueWatchingCard({ watch }: { watch: any }) {
  const title =
    watch.titles?.titre_vf ||
    watch.titles?.titre_vo ||
    watch.episodes?.titre ||
    "Inconnu";
  const imageUrl = watch.titles?.affiche_url;

  return (
    <Link
      href={
        watch.episodes
          ? `/episodes/${watch.episodes.id}`
          : `/titles/${watch.title_id}`
      }
      className="group relative block overflow-hidden rounded-lg"
    >
      <div className="aspect-video relative bg-muted/20">
        {imageUrl ? (
          <img
            src={`https://image.tmdb.org/t/p/w500${imageUrl}`}
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <span className="text-muted-foreground">Pas image</span>
          </div>
        )}

        {/* Overlay */}
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="flex items-center gap-2">
              <PlayCircle className="h-10 w-10 fill-white/80" />
              <span className="text-sm font-medium">Continuer</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-3 bg-background">
        <h3 className="font-medium line-clamp-1 group-hover:text-primary">
          {title}
        </h3>
        <p className="text-xs text-muted-foreground">
          {watch.episodes
            ? `Episode ${watch.episodes.numero}`
            : watch.titles?.type === "serie"
              ? "Serie"
              : "Film"}
        </p>
      </div>
    </Link>
  );
}

// Composant de stat card pour le dashboard
function StatCard({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
    >
      <div className="rounded-full p-3 bg-primary/10 group-hover:bg-primary/20 transition-colors">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </Link>
  );
}

export default function HomePage() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuthStore();
  const searchParams = useSearchParams();
  const filters = parseTitleFilters(searchParams);

  // Hooks pour les données du dashboard
  const { data: recentWatches } = useRecentWatches(4, isAuthenticated);

  const { data: followedSeries } = useFollowedSeries(4, isAuthenticated);

  const { data: popularTitles, isLoading: isLoadingPopular } =
    usePopularTitles(8);

  const { data: calendarEntries, isLoading: isLoadingCalendar } =
    useCalendar(isAuthenticated);

  const { data: recommendations, isLoading: isLoadingRecommendations } =
    useRecommendations(6);

  const { data: userLists } = useLists(isAuthenticated);
  const watchlistId = userLists?.find((list) => list.type === "watchlist")?.id;
  // GET /lists ne renvoie pas les titres au format affichable — on récupère
  // le détail de la liste watchlist pour avoir ses items complets.
  const { data: watchlistDetail } = useList(watchlistId ?? "");
  const { data: watchedTitles } = useWatchedTitles();
  const { data: followedTitleIds } = useFollowedTitleIds();

  const watchlistItems = (watchlistDetail?.items ?? []).filter((item) =>
    titleMatchesFilters(toFilterableTitle(item), filters),
  );

  // Filtre appliqué sur le type uniquement : les visionnages récents
  // n'embarquent pas les genres/pays/note du titre (donnée non disponible
  // sans changement backend plus large).
  const filteredRecentWatches = (recentWatches ?? []).filter((watch) => {
    if (filters.type === "tout") return true;
    return watch.titles?.type === filters.type;
  });

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
      {/* En-tête */}
      <div className="mb-12">
        <h1 className="text-3xl font-bold tracking-tight">
          Bienvenue {isAuthenticated ? `, ${user?.pseudo}` : "sur eMDB"}
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          {isAuthenticated
            ? "Suivez vos films et séries préférés, découvrez des recommandations et explorez."
            : "Découvrez, suivez et partagez vos films et séries préférés."}
        </p>

        {/* CTA pour les invités */}
        {!isAuthenticated && (
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
        )}
      </div>

      {/* Dashboard pour utilisateurs connectés */}
      {isAuthenticated ? (
        <div className="space-y-10">
          {/* Statistiques rapides */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={PlayCircle}
              label="Visionnages"
              value={recentWatches?.length || 0}
              href="/history"
            />
            <StatCard icon={Star} label="Notes" value={0} href="/ratings" />
            <StatCard
              icon={List}
              label="Listes"
              value={userLists?.length || 0}
              href="/profile"
            />
            <StatCard
              icon={Calendar}
              label="Séries suivies"
              value={followedSeries?.length || 0}
              href="/profile"
            />
          </div>

          {/* Historique */}
          {filteredRecentWatches.length > 0 && (
            <DashboardSection
              title="Historique"
              actionLabel="Voir tout l'historique"
              actionHref="/history"
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {filteredRecentWatches.slice(0, 4).map((watch) => (
                  <ContinueWatchingCard key={watch.id} watch={watch} />
                ))}
              </div>
            </DashboardSection>
          )}

          {/* Calendrier */}
          <DashboardSection
            title="Calendrier"
            subtitle="Épisodes à venir de vos séries suivies"
            actionLabel="Voir le calendrier complet"
            actionHref="/calendar"
          >
            {isLoadingCalendar ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-24 rounded-lg bg-muted/50 animate-pulse"
                  />
                ))}
              </div>
            ) : calendarEntries && calendarEntries.length > 0 ? (
              <CalendarEpisodes />
            ) : (
              <p className="text-sm text-muted-foreground py-4">
                Aucun épisode à venir pour le moment.
              </p>
            )}
          </DashboardSection>

          {/* Watchlist */}
          <DashboardSection
            title="Watchlist"
            subtitle="Films et séries à voir"
            actionLabel={
              watchlistItems.length > 0 ? "Voir la watchlist" : undefined
            }
            actionHref={watchlistItems.length > 0 ? `/watchlist` : undefined}
          >
            {watchlistItems.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {watchlistItems.slice(0, 6).map((title) => (
                  <TitleCard
                    key={title.id}
                    title={titleToSearchResult(title)}
                    compact
                    watched={watchedTitles?.has(title.id)}
                    followed={followedTitleIds?.has(title.id)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4">
                Votre watchlist est vide. Ajoutez des titres à voir !
              </p>
            )}
          </DashboardSection>

          {/* Recommandés */}
          <DashboardSection
            title="Recommandés"
            subtitle="Suggestions basées sur vos goûts"
            actionLabel="Voir plus"
            actionHref="/search"
          >
            {isLoadingRecommendations ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {Array.from({ length: 6 }, (_, i) => (
                  <div
                    key={i}
                    className="aspect-[2/3] rounded-lg bg-muted/50 animate-pulse"
                  />
                ))}
              </div>
            ) : recommendations && recommendations.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {recommendations.slice(0, 6).map((title) => (
                  <TitleCard
                    key={title.id}
                    title={titleToSearchResult(title)}
                    compact
                    watched={watchedTitles?.has(title.id)}
                    followed={followedTitleIds?.has(title.id)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4">
                Commencez à noter des titres pour recevoir des recommandations.
              </p>
            )}
          </DashboardSection>
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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {Array.from({ length: 8 }, (_, i) => (
                  <div
                    key={i}
                    className="aspect-[2/3] rounded-lg bg-muted/50 animate-pulse"
                  />
                ))}
              </div>
            ) : popularTitles && popularTitles.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {popularTitles.slice(0, 8).map((title) => (
                  <TitleCard
                    key={title.id}
                    title={titleToSearchResult(title)}
                    compact
                    watched={watchedTitles?.has(title.id)}
                    followed={followedTitleIds?.has(title.id)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4">
                Aucun titre populaire trouvé.
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

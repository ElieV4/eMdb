/**
 * Page de recherche unifiée (films, séries, personnes).
 * Correspondance backend : Phase 3.3 (Titles), 3.4 (People)
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { TitleCard } from "@/components/titles/TitleCard";
import { PersonCard } from "@/components/people/PersonCard";
import {
  useInfiniteTitleSearch,
  useInfinitePeopleSearch,
} from "@/hooks/api/useInfiniteSearch";
import { useWatchedTitles, useListMembership } from "@/hooks/api";
import { SearchType } from "@/lib/types/api";

// Nombre d'éléments par page (scroll infini)
const ITEMS_PER_PAGE = 20;

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Paramètres de recherche depuis l'URL — lus via useSearchParams() (et non
  // via une prop searchParams figée au montage) pour rester réactifs quand le
  // header change le filtre `type` sans démonter la page (bug #33).
  const urlQuery = searchParams.get("query") || "";
  const activeTab = (searchParams.get("type") as SearchType | "tout" | null) || "tout";

  // État local pour le champ de recherche (contrôlé, pour une saisie fluide)
  const [query, setQuery] = useState(urlQuery);

  // Resynchroniser le champ si l'URL change ailleurs (navigation, retour arrière)
  useEffect(() => {
    setQuery(urlQuery);
  }, [urlQuery]);

  // Mettre à jour l'URL quand les paramètres changent
  const updateUrl = (newQuery?: string, newTab?: SearchType | "tout") => {
    const params = new URLSearchParams();
    const q = newQuery ?? query;
    const tab = newTab ?? activeTab;
    if (q) params.set("query", q);
    if (tab !== "tout") params.set("type", tab);
    router.replace(`/search?${params.toString()}`);
  };

  // Gérer le changement de query
  const handleQueryChange = (value: string) => {
    setQuery(value);
    updateUrl(value, undefined);
  };

  // Gérer la recherche (formulaire)
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      updateUrl(query.trim(), activeTab);
    }
  };

  // Hooks de recherche (scroll infini)
  const {
    data: titlesPages,
    isLoading: isTitlesLoading,
    fetchNextPage: fetchNextTitles,
    hasNextPage: hasNextTitles,
    isFetchingNextPage: isFetchingNextTitles,
  } = useInfiniteTitleSearch(
    query && activeTab !== "personne" ? query : "",
    activeTab === "tout" ? undefined : (activeTab as "film" | "serie"),
  );

  const {
    data: peoplePages,
    isLoading: isPeopleLoading,
    fetchNextPage: fetchNextPeople,
    hasNextPage: hasNextPeople,
    isFetchingNextPage: isFetchingNextPeople,
  } = useInfinitePeopleSearch(
    query && activeTab !== "film" && activeTab !== "serie" ? query : "",
  );

  const { data: watchedTitles } = useWatchedTitles();
  const { watchlistIds, favoriteIds } = useListMembership();

  // État de chargement
  const isLoading = isTitlesLoading || isPeopleLoading;
  const isPeopleTab = activeTab === "personne";

  const titlesData = titlesPages?.pages.flatMap((p) => p.items) ?? [];
  const peopleData = peoplePages?.pages.flatMap((p) => p.items) ?? [];

  // Total réel (TMDB total_results + résultats locaux), pas seulement la
  // portion déjà chargée par le scroll infini. En onglet "tout", les titres
  // combinent films + séries dans le même hook (une seule requête `type`
  // non filtré) donc son dernier `total` suffit ; en onglet type filtré,
  // idem.
  const titlesTotal = titlesPages?.pages.at(-1)?.total ?? titlesData.length;
  const peopleTotal = peoplePages?.pages.at(-1)?.total ?? peopleData.length;
  const totalItems = isPeopleTab ? peopleTotal : titlesTotal;

  const hasNextPage = isPeopleTab ? hasNextPeople : hasNextTitles;
  const isFetchingNextPage = isPeopleTab ? isFetchingNextPeople : isFetchingNextTitles;
  const fetchNextPage = isPeopleTab ? fetchNextPeople : fetchNextTitles;

  // Charge la page suivante dès que la sentinelle en bas de grille entre
  // dans le viewport.
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "400px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Générer les placeholders pour le loading
  const loadingPlaceholders = Array.from(
    { length: ITEMS_PER_PAGE },
    (_, i) => i,
  );

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="space-y-6">
        {/* En-tête de recherche */}
        <div className="space-y-4">
          <h1 className="text-2xl font-bold tracking-tight">
            Rechercher dans eMDB
          </h1>

          {/* Barre de recherche */}
          <form onSubmit={handleSearch} className="relative max-w-2xl">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder="Rechercher un film, une série ou une personne..."
                className="w-full rounded-lg border bg-background pl-10 pr-4 py-3 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Rechercher"
                autoFocus
              />
            </div>
          </form>

        </div>

        {/* Résultats */}
        <div className="space-y-8">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {loadingPlaceholders.map((_, index) => (
                <div
                  key={index}
                  className="rounded-lg bg-muted/50 animate-pulse aspect-[2/3]"
                />
              ))}
            </div>
          ) : query && totalItems === 0 ? (
            <div className="text-center py-12">
              <Search className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">
                Aucun résultat trouvé
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Essayez avec d&apos;autres mots-clés ou vérifiez
                l&apos;orthographe.
              </p>
            </div>
          ) : (
            <>
              {/* Total réel (TMDB total_results + résultats locaux) — pas
                  seulement ce qui a déjà été chargé par le scroll infini. */}
              <p className="text-sm text-muted-foreground">
                {totalItems} résultat{totalItems > 1 ? "s" : ""}
              </p>

              {/* Grille de résultats */}
              <div
                className={cn(
                  "grid gap-4",
                  activeTab === "personne"
                    ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
                    : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6",
                )}
              >
                {activeTab === "personne"
                  ? peopleData.map((person) => (
                      <PersonCard key={person.id} person={person} compact />
                    ))
                  : titlesData.map((title) => (
                      <TitleCard
                        key={title.id}
                        title={title}
                        compact
                        watched={watchedTitles?.has(title.id)}
                        inWatchlist={watchlistIds.has(title.id)}
                        inFavorites={favoriteIds.has(title.id)}
                      />
                    ))}
              </div>

              <div ref={sentinelRef} />

              {isFetchingNextPage && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-lg bg-muted/50 animate-pulse aspect-[2/3]"
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* Suggestions si pas de recherche */}
          {!query && !isLoading && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Recherches populaires</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {/* Placeholder pour les suggestions populaires */}
                {Array.from({ length: 6 }, (_, i) => (
                  <div
                    key={i}
                    className="rounded-lg bg-muted/50 aspect-[2/3] animate-pulse"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

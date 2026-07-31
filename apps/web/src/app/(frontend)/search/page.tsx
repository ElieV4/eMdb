/**
 * Page de recherche unifiée (films, séries, personnes).
 * Correspondance backend : Phase 3.3 (Titles), 3.4 (People)
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { TitleCard } from "@/components/titles/TitleCard";
import { PersonCard } from "@/components/people/PersonCard";
import { SimplePagination } from "@/components/common/SimplePagination";
import { useTitles } from "@/hooks/api/useTitles";
import { usePeople } from "@/hooks/api/usePeople";
import {
  TitleSearchResult,
  PersonSearchResult,
  SearchType,
} from "@/lib/types/api";

// Nombre d'éléments par page
const ITEMS_PER_PAGE = 20;

interface SearchPageProps {
  searchParams: {
    query?: string;
    type?: string;
    page?: string;
  };
}

export default function SearchPage({ searchParams }: SearchPageProps) {
  const router = useRouter();

  // Paramètres de recherche depuis l'URL
  const urlQuery = searchParams.query || "";
  const urlTab = searchParams.type as SearchType | "tout" | null;
  const urlPage = searchParams.page || "1";

  // État local
  const [query, setQuery] = useState(urlQuery);
  const [activeTab] = useState<SearchType | "tout">(
    urlTab || "tout",
  );
  const [page, setPage] = useState<number>(parseInt(urlPage) || 1);

  // Mettre à jour l'URL quand les paramètres changent
  const updateUrl = (
    newQuery?: string,
    newTab?: SearchType | "tout",
    newPage?: number,
  ) => {
    const params = new URLSearchParams();
    if (newQuery || query) params.set("query", newQuery || query);
    if (newTab || activeTab !== "tout") {
      if (newTab === "tout") params.delete("type");
      else params.set("type", newTab || activeTab);
    }
    if (newPage || page > 1) {
      if (newPage === 1) params.delete("page");
      else params.set("page", (newPage || page).toString());
    }
    router.replace(`/search?${params.toString()}`);
  };

  // Gérer le changement de query
  const handleQueryChange = (value: string) => {
    setQuery(value);
    setPage(1);
    updateUrl(value, undefined, 1);
  };

  // Gérer le changement de page
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    updateUrl(query, activeTab, newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Gérer la recherche (formulaire)
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      updateUrl(query.trim(), activeTab, 1);
    }
  };

  // Hooks de recherche
  const { data: titlesData, isLoading: isTitlesLoading } = useTitles({
    query: query && activeTab !== "personne" ? query : "",
    type: activeTab === "tout" ? undefined : (activeTab as "film" | "serie"),
    page,
    limit: ITEMS_PER_PAGE,
  });

  const { data: peopleData, isLoading: isPeopleLoading } = usePeople({
    query: query && activeTab !== "film" && activeTab !== "serie" ? query : "",
    page,
    limit: ITEMS_PER_PAGE,
  });

  // État de chargement
  const isLoading = isTitlesLoading || isPeopleLoading;

  // Données à afficher selon le tab
  let totalItems = 0;
  let totalPages = 1;

  if (activeTab === "personne") {
    totalItems = peopleData?.total || 0;
    totalPages = peopleData?.totalPages || 1;
  } else {
    totalItems = titlesData?.total || 0;
    totalPages = titlesData?.totalPages || 1;
  }

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
                  ? peopleData?.items.map((person: PersonSearchResult) => (
                      <PersonCard key={person.id} person={person} compact />
                    ))
                  : titlesData?.items.map((title: TitleSearchResult) => (
                      <TitleCard key={title.id} title={title} compact />
                    ))}
              </div>

              {/* Pagination */}
              <SimplePagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                className="justify-center"
              />
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

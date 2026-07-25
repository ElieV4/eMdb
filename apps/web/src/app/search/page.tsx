/**
 * Page de recherche unifiée (films, séries, personnes).
 * Correspondance backend : Phase 3.3 (Titles), 3.4 (People)
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Film, Tv, Users, SlidersHorizontal } from "lucide-react";
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

// Tabs de recherche
type SearchTab = {
  id: SearchType | "tout";
  label: string;
  icon: React.ReactNode;
};

const SEARCH_TABS: SearchTab[] = [
  { id: "tout", label: "Tout", icon: <Search className="h-4 w-4" /> },
  { id: "film", label: "Films", icon: <Film className="h-4 w-4" /> },
  { id: "serie", label: "Séries", icon: <Tv className="h-4 w-4" /> },
  { id: "personne", label: "Personnes", icon: <Users className="h-4 w-4" /> },
];

// Filtres pour les titres
type TitleFilter = {
  id: string;
  label: string;
  type: "genre" | "country" | "year";
  options?: { value: string; label: string }[];
};

// Genres courants (à remplacer par les vrais genres de la base)
const GENRES = [
  { value: "action", label: "Action" },
  { value: "aventure", label: "Aventure" },
  { value: "comédie", label: "Comédie" },
  { value: "drame", label: "Drame" },
  { value: "horreur", label: "Horreur" },
  { value: "sf", label: "Science-Fiction" },
  { value: "fantastique", label: "Fantastique" },
  { value: "animation", label: "Animation" },
];

// Pays courants
const COUNTRIES = [
  { value: "US", label: "États-Unis" },
  { value: "FR", label: "France" },
  { value: "GB", label: "Royaume-Uni" },
  { value: "JP", label: "Japon" },
  { value: "KR", label: "Corée du Sud" },
  { value: "IN", label: "Inde" },
];

// Années (dernières décennies)
const YEARS = Array.from({ length: 20 }, (_, i) => {
  const year = new Date().getFullYear() - i;
  return { value: year.toString(), label: year.toString() };
}).reverse();

const TITLE_FILTERS: TitleFilter[] = [
  {
    id: "genre",
    label: "Genre",
    type: "genre",
    options: GENRES,
  },
  {
    id: "country",
    label: "Pays",
    type: "country",
    options: COUNTRIES,
  },
  {
    id: "year",
    label: "Année",
    type: "year",
    options: YEARS,
  },
];

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
  const [activeTab, setActiveTab] = useState<SearchType | "tout">(
    urlTab || "tout",
  );
  const [page, setPage] = useState<number>(parseInt(urlPage) || 1);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);

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

  // Gérer le changement de tab
  const handleTabChange = (tab: SearchType | "tout") => {
    setActiveTab(tab);
    setPage(1);
    updateUrl(query, tab, 1);
  };

  // Gérer le changement de page
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    updateUrl(query, activeTab, newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Gérer le changement de filtre
  const handleFilterChange = (filterId: string, value: string) => {
    setFilters((prev) => {
      const newFilters = { ...prev };
      if (value) newFilters[filterId] = value;
      else delete newFilters[filterId];
      return newFilters;
    });
    setPage(1);
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
    genre: filters.genre,
    country: filters.country,
    year: filters.year ? parseInt(filters.year) : undefined,
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

          {/* Tabs de type */}
          <div className="flex gap-1 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
            {SEARCH_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as SearchType | "tout")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
                  "transition-all duration-200 whitespace-nowrap",
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted",
                )}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Filtres */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>Filtres</span>
            </button>
          </div>

          {/* Affichage du nombre de résultats */}
          <div className="text-sm text-muted-foreground">
            {totalItems} résultat{totalItems !== 1 ? "s" : ""} trouvé
            {totalItems !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Filtres dévelopés */}
        {showFilters && activeTab !== "personne" && (
          <div className="flex flex-wrap gap-4 p-4 rounded-lg border bg-muted/30">
            {TITLE_FILTERS.map((filter) => (
              <div key={filter.id} className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">
                  {filter.label}
                </label>
                <select
                  value={filters[filter.id] || ""}
                  onChange={(e) =>
                    handleFilterChange(filter.id, e.target.value)
                  }
                  className="w-40 rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Tous</option>
                  {filter.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}

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

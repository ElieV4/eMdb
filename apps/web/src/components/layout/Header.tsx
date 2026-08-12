/**
 * Header global de l'application.
 * Transparent, avec filtres de type (tout/film/série/personne) au centre
 * et bouton "Filtres" à droite qui déploie une sidebar de filtres
 * (genre, pays, année, note IMDB, listes, statut, date de visionnage).
 * Les filtres sont portés par les paramètres d'URL de la page courante
 * (bug #28/#33/#34) : n'importe quelle page peut les lire via
 * `parseTitleFilters(useSearchParams())`.
 * Modification O : le header filtre s'affiche désormais sur toutes les
 * pages (le composant lui-même n'est de toute façon jamais monté sur
 * /login ni /register, qui ont leur propre layout sans Header). Le filtre
 * par type est centré au milieu du header quand le panneau "Filtres" est
 * fermé, et rejoint le haut du panneau quand il est ouvert (cf.
 * `FilterSidebar.tsx`). L'icône profil (avec son dropdown Profil/
 * Déconnexion) a été retirée : la déconnexion se fait désormais depuis un
 * bouton dédié sur la page Profil elle-même.
 * Retour utilisateur (dataviz) : le filtre header (genre/pays/année/note/
 * listes) est retiré de la page Profil — la page n'a plus de contenu qui le
 * consomme (la section Favoris n'est plus filtrable ainsi, et les visuels
 * dataviz ont chacun leur propre filtre dans leur menu "⋮", cf.
 * `DatavizFilterFields.tsx`).
 */

"use client";

import { useEffect, useState, startTransition } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/auth/useAuth";
import { useTitleGenres, useTitleCountries, useTitleStudios, useLists } from "@/hooks/api";
import { TypeFilterTabs, FilterTab } from "./TypeFilterTabs";
import { FilterSidebar } from "./FilterSidebar";
import {
  parseTitleFilters,
  buildFilterQueryString,
  hasActiveTitleFilters,
  YEAR_RANGE_MIN,
  YEAR_RANGE_MAX,
  WATCHED_YEAR_RANGE_MIN,
  NOTE_IMDB_MIN,
  NOTE_IMDB_MAX,
} from "@/lib/titleFilters";
import { Filter, Film, Tv, Users, Search } from "lucide-react";

const FILTER_TABS: FilterTab[] = [
  { id: "tout", label: "Tout", icon: <Search className="h-3.5 w-3.5" /> },
  { id: "film", label: "Film", icon: <Film className="h-3.5 w-3.5" /> },
  { id: "serie", label: "Série", icon: <Tv className="h-3.5 w-3.5" /> },
  { id: "personne", label: "Personne", icon: <Users className="h-3.5 w-3.5" /> },
];

export function Header() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filterSidebarOpen, setFilterSidebarOpen] = useState(false);

  const { data: genres } = useTitleGenres();
  const { data: countries } = useTitleCountries();
  const { data: studios } = useTitleStudios();
  const { data: userLists } = useLists(isAuthenticated);

  const filters = parseTitleFilters(searchParams);
  // Valeur brute du paramètre `type`, y compris "personne" (spécifique à la
  // page recherche) qu'un `TitleTypeFilter` normalisé par parseTitleFilters
  // ne peut pas représenter — utilisée uniquement pour l'état actif des tabs.
  const rawTypeTab = searchParams.get("type") || "tout";

  const [yearRange, setYearRange] = useState<[number, number]>([
    filters.yearMin ?? YEAR_RANGE_MIN,
    filters.yearMax ?? YEAR_RANGE_MAX,
  ]);
  const [noteRange, setNoteRange] = useState<[number, number]>([
    filters.noteImdbMin ?? NOTE_IMDB_MIN,
    filters.noteImdbMax ?? NOTE_IMDB_MAX,
  ]);
  const [watchedYearRange, setWatchedYearRange] = useState<[number, number]>([
    filters.watchedYearMin ?? WATCHED_YEAR_RANGE_MIN,
    filters.watchedYearMax ?? YEAR_RANGE_MAX,
  ]);

  // Resynchroniser les sliders si l'URL change ailleurs (navigation, reset)
  useEffect(() => {
    setYearRange([filters.yearMin ?? YEAR_RANGE_MIN, filters.yearMax ?? YEAR_RANGE_MAX]);
    setNoteRange([filters.noteImdbMin ?? NOTE_IMDB_MIN, filters.noteImdbMax ?? NOTE_IMDB_MAX]);
    setWatchedYearRange([
      filters.watchedYearMin ?? WATCHED_YEAR_RANGE_MIN,
      filters.watchedYearMax ?? YEAR_RANGE_MAX,
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.yearMin,
    filters.yearMax,
    filters.noteImdbMin,
    filters.noteImdbMax,
    filters.watchedYearMin,
    filters.watchedYearMax,
  ]);

  const navigateWithFilters = (updates: Record<string, string | null>) => {
    const qs = buildFilterQueryString(searchParams, updates);
    // startTransition : évite "Cannot update a component while rendering a
    // différent component" — un router.push() synchrone dans le même tick
    // qu'une interaction menu/slider entre en conflit avec son rendu en cours.
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  };

  // Détecter si on est sur la page search pour afficher l'onglet "Personne"
  const isSearchPage = pathname === "/search";
  // Le filtre "Date de visionnage" n'a de sens que sur l'historique (seule
  // page où chaque entrée porte une date de visionnage individuelle).
  const isHistoryPage = pathname === "/history";
  // La page Profil n'a plus de contenu consommant le filtre header (retour
  // utilisateur) : Favoris n'est plus filtrable ainsi, et les visuels
  // dataviz ont leur propre filtre dans leur menu "⋮".
  const isProfilePage = pathname === "/profile";
  // "Apprécié en France" — n'a de sens que sur Découvrir (page + sous-pages
  // /discover/:module) et Titres recommandés, seules pages dont les modules
  // savent l'appliquer côté backend.
  const showAppreciesFrFilter = pathname.startsWith("/discover") || pathname === "/recommendations";

  // Filtrer les tabs selon la page
  const visibleTabs = isSearchPage
    ? FILTER_TABS
    : FILTER_TABS.filter((t) => t.id !== "personne");

  const setTypeFilter = (id: string) => {
    navigateWithFilters({ type: id === "tout" ? null : id });
  };

  const toggleGenre = (id: string) => {
    const next = filters.genreIds.includes(id)
      ? filters.genreIds.filter((g) => g !== id)
      : [...filters.genreIds, id];
    navigateWithFilters({ genres: next.length > 0 ? next.join(",") : null });
  };

  const toggleCountry = (id: string) => {
    const next = filters.countryIds.includes(id)
      ? filters.countryIds.filter((c) => c !== id)
      : [...filters.countryIds, id];
    navigateWithFilters({ pays: next.length > 0 ? next.join(",") : null });
  };

  const toggleStudio = (id: string) => {
    const next = filters.studioIds.includes(id)
      ? filters.studioIds.filter((s) => s !== id)
      : [...filters.studioIds, id];
    navigateWithFilters({ studios: next.length > 0 ? next.join(",") : null });
  };

  const toggleList = (id: string) => {
    const next = filters.listIds.includes(id)
      ? filters.listIds.filter((l) => l !== id)
      : [...filters.listIds, id];
    navigateWithFilters({ listes: next.length > 0 ? next.join(",") : null });
  };

  // "Tout sélectionner" (modification O) : permet ensuite d'exclure des
  // valeurs facilement en décochant individuellement depuis un état complet,
  // plutôt que de partir d'un état vide (équivalent à "tout" côté filtre).
  const selectAllGenres = () => {
    const ids = (genres ?? []).map((g) => g.id);
    navigateWithFilters({ genres: ids.length > 0 ? ids.join(",") : null });
  };

  const selectAllCountries = () => {
    const ids = (countries ?? []).map((c) => c.id);
    navigateWithFilters({ pays: ids.length > 0 ? ids.join(",") : null });
  };

  const selectAllStudios = () => {
    const ids = (studios ?? []).map((s) => s.id);
    navigateWithFilters({ studios: ids.length > 0 ? ids.join(",") : null });
  };

  const selectAllLists = () => {
    const ids = (userLists ?? []).map((l) => l.id);
    navigateWithFilters({ listes: ids.length > 0 ? ids.join(",") : null });
  };

  const setWatchedStatus = (status: string) => {
    navigateWithFilters({ vu: status === "tout" ? null : status });
  };

  const toggleAppreciesFr = () => {
    navigateWithFilters({ fr: filters.appreciesFr ? null : "1" });
  };

  const commitYearRange = (next: [number, number]) => {
    navigateWithFilters({
      yearMin: next[0] === YEAR_RANGE_MIN ? null : String(next[0]),
      yearMax: next[1] === YEAR_RANGE_MAX ? null : String(next[1]),
    });
  };

  const commitNoteRange = (next: [number, number]) => {
    navigateWithFilters({
      noteImdbMin: next[0] === NOTE_IMDB_MIN ? null : String(next[0]),
      noteImdbMax: next[1] === NOTE_IMDB_MAX ? null : String(next[1]),
    });
  };

  const commitWatchedYearRange = (next: [number, number]) => {
    navigateWithFilters({
      vuAnneeMin: next[0] === WATCHED_YEAR_RANGE_MIN ? null : String(next[0]),
      vuAnneeMax: next[1] === YEAR_RANGE_MAX ? null : String(next[1]),
    });
  };

  const resetFilters = () => {
    navigateWithFilters({
      type: null,
      genres: null,
      pays: null,
      studios: null,
      yearMin: null,
      yearMax: null,
      noteImdbMin: null,
      noteImdbMax: null,
      listes: null,
      vu: null,
      vuAnneeMin: null,
      vuAnneeMax: null,
      fr: null,
    });
  };

  return (
    <header className="sticky top-0 z-50 bg-background">
      <div className="mx-auto grid grid-cols-3 items-center max-w-7xl px-4 py-2">
        {/* Colonne gauche : logo eMDB, visible seulement < lg (à lg et plus,
            le logo vit déjà dans la Sidebar) — remplace l'ancien div vide
            qui ne servait qu'à équilibrer la grille. */}
        <div>
          <Link href="/" className="text-lg font-bold tracking-tight lg:hidden">
            eMDB
          </Link>
        </div>

        {/* Filtres centraux — visibles à toutes les tailles (icône seule
            si trop peu de place, cf. TypeFilterTabs), masqués quand le
            panneau "Filtres" est ouvert (le filtre par type y migre alors
            en premier contrôle, cf. FilterSidebar). */}
        <div className="flex items-center justify-center gap-1">
          {!filterSidebarOpen && !isProfilePage && (
            <TypeFilterTabs tabs={visibleTabs} active={rawTypeTab} onChange={setTypeFilter} />
          )}
        </div>

        {/* Actions droite */}
        <div className="flex items-center justify-end gap-2">
          {/* Bouton "Filtres" — déploie le panneau de filtres (sidebar
              droite si assez de place, sinon feuille du bas, cf.
              FilterSidebar) ; absent sur Profil, cf. isProfilePage. */}
          {!isProfilePage && (
            <button
              onClick={() => setFilterSidebarOpen((v) => !v)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                filterSidebarOpen || hasActiveTitleFilters(filters)
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              <Filter className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Filtres</span>
            </button>
          )}
        </div>
      </div>

      <FilterSidebar
        open={filterSidebarOpen && !isProfilePage}
        onClose={() => setFilterSidebarOpen(false)}
        filters={filters}
        typeTabs={visibleTabs}
        activeType={rawTypeTab}
        onTypeChange={setTypeFilter}
        genres={genres}
        countries={countries}
        studios={studios}
        lists={userLists}
        yearRange={yearRange}
        onYearRangeChange={setYearRange}
        onYearRangeCommit={commitYearRange}
        noteRange={noteRange}
        onNoteRangeChange={setNoteRange}
        onNoteRangeCommit={commitNoteRange}
        showWatchedDateFilter={isHistoryPage}
        watchedYearRange={watchedYearRange}
        onWatchedYearRangeChange={setWatchedYearRange}
        onWatchedYearRangeCommit={commitWatchedYearRange}
        showAppreciesFrFilter={showAppreciesFrFilter}
        onToggleAppreciesFr={toggleAppreciesFr}
        onToggleGenre={toggleGenre}
        onToggleCountry={toggleCountry}
        onToggleStudio={toggleStudio}
        onToggleList={toggleList}
        onSelectAllGenres={selectAllGenres}
        onSelectAllCountries={selectAllCountries}
        onSelectAllStudios={selectAllStudios}
        onSelectAllLists={selectAllLists}
        onWatchedStatusChange={setWatchedStatus}
        onReset={resetFilters}
      />
    </header>
  );
}

/**
 * Header global de l'application.
 * Transparent, avec filtres de type (tout/film/série/personne) au centre
 * et bouton "Filtres" à droite qui déploie une sidebar de filtres
 * (genre, pays, année, note IMDB).
 * Les filtres sont portés par les paramètres d'URL de la page courante
 * (bug #28/#33/#34) : n'importe quelle page peut les lire via
 * `parseTitleFilters(useSearchParams())`.
 * Redirige vers /login après déconnexion.
 */

"use client";

import { useEffect, useState, startTransition } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/auth/useAuth";
import { useLogout } from "@/hooks/auth/useLogout";
import { useTitleGenres, useTitleCountries } from "@/hooks/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FilterSidebar } from "./FilterSidebar";
import {
  parseTitleFilters,
  buildFilterQueryString,
  hasActiveTitleFilters,
  YEAR_RANGE_MIN,
  YEAR_RANGE_MAX,
  NOTE_IMDB_MIN,
  NOTE_IMDB_MAX,
} from "@/lib/titleFilters";
import {
  Menu,
  X,
  User,
  LogOut,
  Filter,
  Film,
  Tv,
  Users,
  Search,
  Calendar,
  List,
  History,
  UserCircle,
  BookmarkCheck,
} from "lucide-react";

// Types de filtre
type FilterTab = {
  id: string;
  label: string;
  icon: React.ReactNode;
};

const FILTER_TABS: FilterTab[] = [
  { id: "tout", label: "Tout", icon: <Search className="h-3.5 w-3.5" /> },
  { id: "film", label: "Film", icon: <Film className="h-3.5 w-3.5" /> },
  { id: "serie", label: "Série", icon: <Tv className="h-3.5 w-3.5" /> },
  { id: "personne", label: "Personne", icon: <Users className="h-3.5 w-3.5" /> },
];

// Pages où les filtres de type/genre/pays/année/note ont un effet réel sur le
// contenu affiché (bug #33/#34). "/" est un préfixe exact, les autres
// couvrent aussi leurs sous-routes (ex. /lists/:id).
const FILTER_VISIBLE_PATHS = [
  "/",
  "/search",
  "/calendar",
  "/watchlist",
  "/lists",
  "/history",
];

export function Header() {
  const { isAuthenticated, user } = useAuth();
  const logout = useLogout();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [menuOpen, setMenuOpen] = useState(false);
  const [filterSidebarOpen, setFilterSidebarOpen] = useState(false);

  const { data: genres } = useTitleGenres();
  const { data: countries } = useTitleCountries();

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

  // Resynchroniser les sliders si l'URL change ailleurs (navigation, reset)
  useEffect(() => {
    setYearRange([filters.yearMin ?? YEAR_RANGE_MIN, filters.yearMax ?? YEAR_RANGE_MAX]);
    setNoteRange([filters.noteImdbMin ?? NOTE_IMDB_MIN, filters.noteImdbMax ?? NOTE_IMDB_MAX]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.yearMin, filters.yearMax, filters.noteImdbMin, filters.noteImdbMax]);

  const navigateWithFilters = (updates: Record<string, string | null>) => {
    const qs = buildFilterQueryString(searchParams, updates);
    // startTransition : évite "Cannot update a component while rendering a
    // different component" — un router.push() synchrone dans le même tick
    // qu'une interaction menu/slider entre en conflit avec son rendu en cours.
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  };

  // Détecter si on est sur la page search pour afficher l'onglet "Personne"
  const isSearchPage = pathname === "/search";

  // Pages où les filtres de type ont un effet réel (bug #33/#34 : le menu
  // s'affichait partout, y compris sur des pages où il ne filtrait rien).
  const isHistoryPage = pathname === "/history";
  const showTypeTabs = FILTER_VISIBLE_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + "/"),
  );
  // Le menu "Filtres" (genre/pays/année/note) ne s'applique pas à
  // l'historique : les visionnages n'embarquent pas ces données du titre.
  const showFilterSidebarButton = showTypeTabs && !isHistoryPage;

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

  const resetFilters = () => {
    navigateWithFilters({
      type: null,
      genres: null,
      pays: null,
      yearMin: null,
      yearMax: null,
      noteImdbMin: null,
      noteImdbMax: null,
    });
  };

  // Redirect to login after successful logout
  useEffect(() => {
    if (logout.isSuccess) {
      router.push("/login");
    }
  }, [logout.isSuccess, router]);

  // Navigation links for mobile menu
  const navLinks = [
    { href: "/", label: "Accueil", icon: <Search className="h-4 w-4" /> },
    { href: "/search", label: "Recherche", icon: <Search className="h-4 w-4" /> },
    { href: "/calendar", label: "Calendrier", icon: <Calendar className="h-4 w-4" /> },
    { href: "/watchlist", label: "Watchlist", icon: <BookmarkCheck className="h-4 w-4" /> },
    { href: "/lists", label: "Listes", icon: <List className="h-4 w-4" /> },
    { href: "/history", label: "Historique", icon: <History className="h-4 w-4" /> },
    { href: "/profile", label: "Profil", icon: <UserCircle className="h-4 w-4" /> },
  ];

  return (
    <header className="sticky top-0 z-50">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2">
        {/* Filtres centraux - visible sur desktop uniquement, pages pertinentes seulement */}
        <div className="hidden lg:flex items-center gap-1">
          {showTypeTabs &&
            visibleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTypeFilter(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                  rawTypeTab === tab.id
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
        </div>

        {/* Actions droite */}
        <div className="flex items-center gap-2">
          {/* Bouton "Filtres" — déploie la sidebar droite */}
          {showFilterSidebarButton && (
            <button
              onClick={() => setFilterSidebarOpen((v) => !v)}
              className={`hidden lg:flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                filterSidebarOpen || hasActiveTitleFilters(filters)
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              <Filter className="h-3.5 w-3.5" />
              <span>Filtres</span>
            </button>
          )}

          {/* Utilisateur connecté */}
          {isAuthenticated ? (
            <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
              <DropdownMenuTrigger className="flex items-center justify-center rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" aria-label="Menu utilisateur">
                <User className="h-5 w-5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="px-2 py-1.5 text-sm font-medium">
                  {user?.pseudo}
                </div>
                <DropdownMenuItem>
                  <Link href="/profile" className="w-full">
                    Profil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => logout.mutate()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}

          {/* Menu hamburger mobile */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            {menuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {showFilterSidebarButton && (
        <FilterSidebar
          open={filterSidebarOpen}
          onClose={() => setFilterSidebarOpen(false)}
          filters={filters}
          genres={genres}
          countries={countries}
          yearRange={yearRange}
          onYearRangeChange={setYearRange}
          onYearRangeCommit={commitYearRange}
          noteRange={noteRange}
          onNoteRangeChange={setNoteRange}
          onNoteRangeCommit={commitNoteRange}
          onToggleGenre={toggleGenre}
          onToggleCountry={toggleCountry}
          onReset={resetFilters}
        />
      )}

      {/* Menu navigation mobile */}
      {menuOpen && (
        <nav className="border-t px-4 py-2 lg:hidden bg-background/95 backdrop-blur">
          {/* Filtres centraux en mobile */}
          {showTypeTabs && (
          <div className="flex gap-1 overflow-x-auto pb-3 mb-3 border-b">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setTypeFilter(tab.id);
                  setMenuOpen(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                  rawTypeTab === tab.id
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
          )}

          {/* Liens de navigation */}
          <div className="space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
                onClick={() => setMenuOpen(false)}
              >
                {link.icon}
                <span>{link.label}</span>
              </Link>
            ))}
          </div>

          {!isAuthenticated && (
            <div className="mt-3 pt-3 border-t space-y-1">
              <Link
                href="/login"
                className="block rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
                onClick={() => setMenuOpen(false)}
              >
                Connexion
              </Link>
              <Link
                href="/register"
                className="block rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
                onClick={() => setMenuOpen(false)}
              >
                Inscription
              </Link>
            </div>
          )}
        </nav>
      )}
    </header>
  );
}

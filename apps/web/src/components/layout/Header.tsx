/**
 * Header global de l'application.
 * Transparent, avec filtres de type (tout/film/série/personne) au centre
 * et menu filtre (genre, date, durée, statut, région, dans vu, dans watchlist) à droite.
 * Redirige vers /login après déconnexion.
 */

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/auth/useAuth";
import { useLogout } from "@/hooks/auth/useLogout";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
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

// Options du menu filtre
const FILTER_OPTIONS = [
  { id: "genre", label: "Genre" },
  { id: "date", label: "Date de sortie" },
  { id: "duree", label: "Durée" },
  { id: "statut", label: "Statut" },
  { id: "region", label: "Région (pays)" },
  { id: "dans-vu", label: "Dans vu" },
  { id: "dans-watchlist", label: "Dans watchlist" },
];

export function Header() {
  const { isAuthenticated, user } = useAuth();
  const logout = useLogout();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>("tout");

  // Détecter si on est sur la page search pour afficher l'onglet "Personne"
  const isSearchPage = pathname === "/search";

  // Filtrer les tabs selon la page
  const visibleTabs = isSearchPage
    ? FILTER_TABS
    : FILTER_TABS.filter((t) => t.id !== "personne");

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
        {/* Filtres centraux - visible sur desktop uniquement */}
        <div className="hidden lg:flex items-center gap-1">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                activeFilter === tab.id
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
          {/* Menu filtre (genre, date, durée, statut, région, dans vu, dans watchlist) */}
          <DropdownMenu>
            <DropdownMenuTrigger className="hidden lg:flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              <Filter className="h-3.5 w-3.5" />
              <span>Filtres</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
                  Filtres
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
              </DropdownMenuGroup>
              {FILTER_OPTIONS.map((option) => (
                <DropdownMenuItem key={option.id} className="text-sm cursor-pointer">
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

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

      {/* Menu navigation mobile */}
      {menuOpen && (
        <nav className="border-t px-4 py-2 lg:hidden bg-background/95 backdrop-blur">
          {/* Filtres centraux en mobile */}
          <div className="flex gap-1 overflow-x-auto pb-3 mb-3 border-b">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveFilter(tab.id);
                  setMenuOpen(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                  activeFilter === tab.id
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

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

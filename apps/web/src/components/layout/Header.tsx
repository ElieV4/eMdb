/**
 * Header global de l'application.
 * Navigation responsive + thème + auth.
 * Redirige vers /login après déconnexion.
 */

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/auth/useAuth";
import { useLogout } from "@/hooks/auth/useLogout";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, X, User, LogOut, Search } from "lucide-react";
import { TitleSearchBar } from "@/components/titles/TitleSearchBar";

export function Header() {
  const { isAuthenticated, user } = useAuth();
  const logout = useLogout();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Redirect to login after successful logout
  useEffect(() => {
    if (logout.isSuccess) {
      router.push("/login");
    }
  }, [logout.isSuccess, router]);

  const navLinks = [
    { href: "/", label: "Accueil" },
    { href: "/search", label: "Recherche" },
    { href: "/calendar", label: "Calendrier" },
    { href: "/lists", label: "Mes listes" },
    { href: "/dataviz", label: "Dataviz" },
    { href: "/notifications", label: "Notifications" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-bold tracking-tight">
            eMDB
          </Link>
          <div className="hidden lg:flex flex-1 max-w-md">
            <TitleSearchBar
              placeholder="Rechercher un film, une série ou une personne..."
              showSuggestions={true}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="lg:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchOpen(!searchOpen)}
              aria-label="Rechercher"
            >
              <Search className="h-5 w-5" />
            </Button>
          </div>
          <nav className="hidden lg:flex gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          {isAuthenticated ? (
            <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
              <DropdownMenuTrigger>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Menu utilisateur"
                >
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="px-2 py-1.5 text-sm font-medium">
                  {user?.pseudo}
                </div>
                <DropdownMenuItem>
                  <Link href="/profile" className="w-full">Profil</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => logout.mutate()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden lg:flex gap-2">
              <Link href="/login" className="underline">
                Connexion
              </Link>
              <Link href="/register" className="underline">
                Inscription
              </Link>
            </div>
          )}
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

      {/* Barre de recherche mobile */}
      {searchOpen && (
        <div className="border-t px-4 py-2 lg:hidden">
          <TitleSearchBar
            placeholder="Rechercher un film, une série ou une personne..."
            showSuggestions={true}
            onSearch={() => setSearchOpen(false)}
          />
        </div>
      )}

      {/* Menu navigation mobile */}
      {menuOpen && (
        <nav className="border-t px-4 py-2 lg:hidden">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          {!isAuthenticated && (
            <>
              <Link
                href="/login"
                className="block py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                onClick={() => setMenuOpen(false)}
              >
                Connexion
              </Link>
              <Link
                href="/register"
                className="block py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                onClick={() => setMenuOpen(false)}
              >
                Inscription
              </Link>
            </>
          )}
        </nav>
      )}
    </header>
  );
}

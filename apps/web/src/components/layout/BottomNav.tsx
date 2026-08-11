/**
 * Navigation du bas (mobile/tablette, < lg) : remplace l'ancien menu
 * hamburger/drawer plein écran par une barre fixe toujours visible avec
 * juste les icônes des pages principales — évite l'état "rétracté" moche
 * de l'ancienne sidebar quand il manquait de place (retour utilisateur).
 * Les sous-pages (Continuer à regarder, Watchlist, Tendances...) restent
 * accessibles depuis Accueil/Découvrir/Listes, comme demandé.
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Home, Compass, List, UserCircle, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/search", label: "Recherche", icon: Search },
  { href: "/", label: "Accueil", icon: Home },
  { href: "/discover", label: "Découvrir", icon: Compass },
  { href: "/lists", label: "Listes", icon: List },
  { href: "/profile", label: "Profil", icon: UserCircle },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex h-14 items-stretch justify-around border-t border-border bg-background lg:hidden">
      {ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-label={item.label}
            title={item.label}
            className={cn(
              "flex flex-1 items-center justify-center transition-colors",
              active ? "text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-6 w-6" />
          </Link>
        );
      })}
    </nav>
  );
}

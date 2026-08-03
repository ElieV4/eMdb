import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Search,
  Menu,
  X,
  List,
  UserCircle,
  Home,
  Compass,
  LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/auth/useAuth";
import { useLists } from "@/hooks/api/useLists";
import { UserList } from "@/lib/types/api";

type NavChild = { href: string; label: string };
type NavItem = { href: string; label: string; icon: LucideIcon; children?: NavChild[] };

// "Listes" affiche toujours "Favoris" (liste spéciale type "favoris",
// toujours créée pour l'utilisateur) puis les listes personnalisées de
// l'utilisateur (modification N).
function buildNavTree(userLists: UserList[] | undefined): { main: NavItem[]; profile: NavItem } {
  const favoris = userLists?.find((list) => list.type === "favoris");
  const customLists = (userLists ?? []).filter((list) => list.type === "custom");

  const listesChildren: NavChild[] = [
    ...(favoris ? [{ href: `/lists/${favoris.id}`, label: "Favoris" }] : []),
    ...customLists.map((list) => ({ href: `/lists/${list.id}`, label: list.nom })),
  ];

  return {
    main: [
      { href: "/search", label: "Recherche", icon: Search },
      {
        href: "/",
        label: "Accueil",
        icon: Home,
        children: [
          { href: "/continue-watching", label: "Continuer à regarder" },
          { href: "/watchlist", label: "Watchlist" },
          { href: "/calendar", label: "Calendrier" },
          { href: "/history", label: "Historique" },
          { href: "/recommendations", label: "Recommandés" },
        ],
      },
      {
        href: "/discover",
        label: "Découvrir",
        icon: Compass,
        children: [
          { href: "/discover/tendances", label: "Tendances" },
          { href: "/discover/populaires", label: "Populaires" },
          { href: "/discover/attendus", label: "Attendus" },
          { href: "/discover/sorties", label: "Sorties" },
        ],
      },
      {
        href: "/lists",
        label: "Listes",
        icon: List,
        children: listesChildren,
      },
    ],
    profile: { href: "/profile", label: "Profil", icon: UserCircle },
  };
}

function isTopLevelActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}

// Item de premier niveau (Recherche, Accueil, Découvrir, Listes, Profil) :
// volontairement plus imposant que les sous-items pour bien marquer la
// hiérarchie de l'arbre (modification N, retour utilisateur).
function TopLevelLink({
  href,
  label,
  icon: Icon,
  isActive,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2.5 text-base font-semibold transition-colors",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-foreground/90 hover:text-foreground hover:bg-muted"
      )}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </Link>
  );
}

function SidebarNav({
  tree,
  pathname,
  onNavigate,
  className,
}: {
  tree: NavItem[];
  pathname: string;
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <nav className={cn("flex flex-col gap-3", className)}>
      {tree.map((item) => (
        <div key={item.href}>
          <TopLevelLink
            href={item.href}
            label={item.label}
            icon={item.icon}
            isActive={isTopLevelActive(pathname, item.href)}
            onNavigate={onNavigate}
          />
          {item.children && item.children.length > 0 && (
            <div className="mt-1 flex flex-col gap-0.5">
              {item.children.map((child) => {
                const isChildActive = pathname === child.href;
                return (
                  <Link
                    key={child.href}
                    href={child.href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center rounded-md py-1 pl-11 pr-3 text-xs font-normal transition-colors truncate",
                      isChildActive
                        ? "text-primary font-medium"
                        : "text-muted-foreground/80 hover:text-foreground hover:bg-muted"
                    )}
                  >
                    {child.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </nav>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const { data: userLists } = useLists(isAuthenticated);
  const { main, profile } = useMemo(() => buildNavTree(userLists), [userLists]);

  return (
    <>
      {/* Desktop sidebar : eMDB fixé en haut, arbre de navigation centré au
          milieu, Profil fixé en bas (modification N, retour utilisateur). */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:z-40 lg:border-r">
        <div className="flex flex-col h-full px-4 py-6">
          <Link href="/" className="text-xl font-bold tracking-tight">
            eMDB
          </Link>

          <div className="flex-1 flex flex-col justify-center overflow-y-auto py-6">
            <SidebarNav tree={main} pathname={pathname} />
          </div>

          <TopLevelLink
            href={profile.href}
            label={profile.label}
            icon={profile.icon}
            isActive={isTopLevelActive(pathname, profile.href)}
          />
        </div>
      </div>

      {/* Mobile header */}
      <div className="lg:hidden flex items-center gap-2 px-4 py-3 border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(true)}
          aria-label="Menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <Link href="/" className="text-lg font-bold tracking-tight">
          eMDB
        </Link>
      </div>

      {/* Mobile overlay menu */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <div className="relative flex flex-col h-full w-64 border-r bg-background">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <Link
                href="/"
                className="text-lg font-bold tracking-tight"
                onClick={() => setOpen(false)}
              >
                eMDB
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                aria-label="Fermer le menu"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 flex flex-col justify-center overflow-y-auto px-4 py-4">
              <SidebarNav tree={main} pathname={pathname} onNavigate={() => setOpen(false)} />
            </div>
            <div className="px-4 py-3 border-t">
              <TopLevelLink
                href={profile.href}
                label={profile.label}
                icon={profile.icon}
                isActive={isTopLevelActive(pathname, profile.href)}
                onNavigate={() => setOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

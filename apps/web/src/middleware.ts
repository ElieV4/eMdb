/**
 * Middleware Next.js pour protéger les routes.
 * Vérifie le cookie `emdb_access_token` pour les routes protégées.
 * Redirige vers `/login` si non authentifié.
 *
 * Note : Le cookie est non-httpOnly (set par le frontend).
 * Le cookie httpOnly sera géré par le backend dans une future itération.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes publiques : /login, /register, /titles/:id, /people/:id (fiches
// consultables sans connexion). L'accueil ("/") n'en fait PAS partie : il
// nécessite une connexion, comme toutes les autres pages.
const PUBLIC_PATHS = ["/login", "/register", "/titles", "/people"];
const COOKIE_NAME = "emdb_access_token";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and API routes
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + "/"),
  );

  if (isPublic) {
    return NextResponse.next();
  }

  // Check for access token cookie on protected routes
  const accessToken = request.cookies.get(COOKIE_NAME)?.value;

  if (!accessToken) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|api).*)"],
};

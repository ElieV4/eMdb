/**
 * Barre de recherche pour les titres avec suggestions (autocomplete).
 * Utilise le hook useSearch avec debounce pour éviter les requêtes inutiles.
 */

"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Search, X, ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSearch } from "@/hooks/api/useSearch";
import { TitleSearchResult, PersonSearchResult } from "@/lib/types/api";

interface TitleSearchBarProps {
  placeholder?: string;
  className?: string;
  onSearch?: (query: string) => void;
  showSuggestions?: boolean;
}

const MAX_SUGGESTIONS = 5;

function resolveImageUrl(src?: string | null): string {
  if (!src) return "/placeholder-poster.jpg";
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  return `https://image.tmdb.org/t/p/w92${src}`;
}

export function TitleSearchBar({
  placeholder = "Rechercher un film, une série ou une personne...",
  className,
  onSearch,
  showSuggestions = true,
}: TitleSearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  // Hook de recherche
  const { data, isLoading, isError } = useSearch({
    query: debouncedQuery,
    type: undefined,
    page: 1,
    limit: MAX_SUGGESTIONS,
  });

  // Click outside to close suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsFocused(false);
        setActiveSuggestionIndex(-1);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const suggestions = [
      ...(data.titles?.items.slice(0, MAX_SUGGESTIONS) || []),
      ...(data.people?.items.slice(0, MAX_SUGGESTIONS) || []),
    ];

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveSuggestionIndex((prev) =>
          Math.min(prev + 1, suggestions.length - 1),
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveSuggestionIndex((prev) => Math.max(prev - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (activeSuggestionIndex >= 0 && suggestions[activeSuggestionIndex]) {
          const suggestion = suggestions[activeSuggestionIndex];
          if ("type" in suggestion) {
            router.push(`/titles/${suggestion.id}`);
          } else {
            router.push(`/people/${suggestion.id}`);
          }
          setIsFocused(false);
          setActiveSuggestionIndex(-1);
          setQuery("");
        } else if (query.trim()) {
          router.push(`/search?query=${encodeURIComponent(query.trim())}`);
          setIsFocused(false);
        }
        break;
      case "Escape":
        setIsFocused(false);
        setActiveSuggestionIndex(-1);
        break;
    }
  };

  // Form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      if (onSearch) {
        onSearch(query.trim());
      } else {
        router.push(`/search?query=${encodeURIComponent(query.trim())}`);
      }
      setIsFocused(false);
    }
  };

  // Click on suggestion
  const handleSuggestionClick = (
    suggestion: TitleSearchResult | PersonSearchResult,
  ) => {
    if ("type" in suggestion) {
      router.push(`/titles/${suggestion.id}`);
    } else {
      router.push(`/people/${suggestion.id}`);
    }
    setIsFocused(false);
    setQuery("");
  };

  const suggestions = [
    ...(data.titles?.items.slice(0, MAX_SUGGESTIONS) || []),
    ...(data.people?.items.slice(0, MAX_SUGGESTIONS) || []),
  ];

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground shrink-0"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              setIsFocused(true);
              if (query) setActiveSuggestionIndex(-1);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={cn(
              "w-full rounded-lg border bg-background pl-10 pr-10 py-2.5 text-sm",
              "placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-primary",
              "transition-colors duration-200",
              isError ? "border-destructive" : "border-input",
            )}
            aria-label="Rechercher un film, une série ou une personne"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Effacer la recherche"
            >
              <X className="h-4 w-4 shrink-0" />
            </button>
          )}
          {isLoading && query && (
            <Loader2
              className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground"
              aria-hidden="true"
            />
          )}
        </div>
      </form>

      {showSuggestions && isFocused && query && (
        <div
          className={cn(
            "absolute left-0 right-0 top-full mt-1 z-50",
            "rounded-lg border bg-background shadow-lg",
            "max-h-80 overflow-y-auto",
          )}
        >
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              <Loader2 className="mx-auto h-4 w-4 animate-spin" />
              <p className="mt-1">Recherche en cours...</p>
            </div>
          ) : suggestions.length > 0 ? (
            <div className="py-2">
              {suggestions.map((suggestion, index) => {
                const isActive = index === activeSuggestionIndex;
                const isTitle = "type" in suggestion;

                return (
                  <button
                    key={`${isTitle ? "title" : "person"}-${suggestion.id}`}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2 text-left",
                      "transition-colors duration-150",
                      isActive
                        ? "bg-muted/50 text-foreground"
                        : "hover:bg-muted/30 text-muted-foreground",
                    )}
                  >
                    <div className="relative h-10 w-14 shrink-0 overflow-hidden rounded">
                      {isTitle ? (
                        <img
                          src={
                            suggestion.afficheUrl
                              ? resolveImageUrl(suggestion.afficheUrl)
                              : "/placeholder-poster.jpg"
                          }
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <img
                          src={
                            suggestion.photoUrl
                              ? resolveImageUrl(suggestion.photoUrl)
                              : "/placeholder-person.jpg"
                          }
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-1">
                        {isTitle ? suggestion.titre : suggestion.nom}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {isTitle
                          ? `${suggestion.dateSortie ? new Date(suggestion.dateSortie).getFullYear() : "?"} - ${suggestion.type === "film" ? "Film" : "Série"}`
                          : suggestion.rolePrincipal || "Acteur"}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground/70 shrink-0">
                      {isTitle
                        ? suggestion.type === "film"
                          ? "Film"
                          : "Série"
                        : "Personne"}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            query &&
            !isLoading && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                <p>Aucun résultat trouvé pour &quot;{query}&quot;</p>
                <button
                  onClick={() => {
                    router.push(`/search?query=${encodeURIComponent(query)}`);
                    setIsFocused(false);
                  }}
                  className="mt-2 text-sm text-primary hover:underline"
                >
                  Voir tous les résultats
                </button>
              </div>
            )
          )}
          {suggestions.length > 0 && (
            <div className="border-t p-2">
              <button
                onClick={() => {
                  router.push(`/search?query=${encodeURIComponent(query)}`);
                  setIsFocused(false);
                }}
                className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                Voir tous les résultats pour &quot;{query}&quot;
                <ChevronDown className="h-3 w-3 -rotate-90" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

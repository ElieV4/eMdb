"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { apiFetch } from "@/lib/api/apiClient";
import { buildEntityUrl } from "@/lib/utils";

export default function TmdbTitleImportPage({
  params,
  searchParams,
}: {
  params: { tmdbId: string };
  searchParams: { type?: string };
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  // Le double-appel React StrictMode (dev) relançait sinon l'import en
  // parallèle deux fois — inoffensif mais double le nombre d'appels TMDB
  // pendant l'import (déjà coûteux pour un titre au casting nombreux, bug #35).
  const startedFor = useRef<string | null>(null);

  const tmdbId = params.tmdbId;
  const type = searchParams.type || "film";

  useEffect(() => {
    const importTitle = async () => {
      try {
        // Import complet côté serveur (credits inclus), potentiellement long —
        // le timeout par défaut de 10s d'apiFetch abortait la requête avant la
        // fin ("signal is aborted"), cause probable du bug #35. Même fix que
        // useRefreshFilmography (bug #27) et useGetOrImportTitle (modification M).
        // Le vrai correctif du bug #35 est côté backend (importPersonByTmdbId
        // ne re-fetchait jamais les personnes déjà connues localement) ; ce
        // timeout élevé reste une marge de sécurité pour les cas encore lents.
        const data = await apiFetch<{ id: string; titre_vo?: string; titre_vf?: string | null }>(
          `/titles/tmdb/${encodeURIComponent(tmdbId)}?type=${encodeURIComponent(type)}`,
          { timeoutMs: 120_000 },
        );

        const localId = data?.id;
        if (!localId) {
          throw new Error("Réponse inattendue lors de l'import du titre.");
        }

        router.replace(buildEntityUrl("/titles", localId, data.titre_vf || data.titre_vo));
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Erreur lors de l'import du titre.";
        console.error("[TmdbTitleImportPage]", tmdbId, type, message);
        setError(message);
      }
    };

    if (tmdbId && startedFor.current !== tmdbId) {
      startedFor.current = tmdbId;
      importTitle();
    }
  }, [tmdbId, type, router]);

  if (error) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-12">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-12">
      <LoadingSpinner className="mx-auto" />
    </div>
  );
}

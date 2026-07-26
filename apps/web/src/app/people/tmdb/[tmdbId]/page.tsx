"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { apiFetch } from "@/lib/api/apiClient";

export default function TmdbPersonImportPage({
  params,
}: {
  params: { tmdbId: string };
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const tmdbId = params.tmdbId;

  useEffect(() => {
    const importPerson = async () => {
      try {
        const data = await apiFetch<{ id: string }>(
          `/people/tmdb/${encodeURIComponent(tmdbId)}`,
        );

        const localId = data?.id;
        if (!localId) {
          throw new Error("Réponse inattendue lors de l'import de la personne.");
        }

        router.replace(`/people/${localId}`);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erreur lors de l'import de la personne.";
        console.error("[TmdbPersonImportPage]", message);
        setError(message);
      }
    };

    if (tmdbId) {
      importPerson();
    }
  }, [tmdbId, router]);

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

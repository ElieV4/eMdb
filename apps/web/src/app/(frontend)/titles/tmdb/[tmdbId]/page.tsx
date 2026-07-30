"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { apiFetch } from "@/lib/api/apiClient";

export default function TmdbTitleImportPage({
  params,
  searchParams,
}: {
  params: { tmdbId: string };
  searchParams: { type?: string };
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const tmdbId = params.tmdbId;
  const type = searchParams.type || "film";

  useEffect(() => {
    const importTitle = async () => {
      try {
        const data = await apiFetch<{ id: string }>(
          `/titles/tmdb/${encodeURIComponent(tmdbId)}?type=${encodeURIComponent(type)}`,
        );

        const localId = data?.id;
        if (!localId) {
          throw new Error("Réponse inattendue lors de l'import du titre.");
        }

        router.replace(`/titles/${localId}`);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Erreur lors de l'import du titre.";
        console.error("[TmdbTitleImportPage]", tmdbId, type, message);
        setError(message);
      }
    };

    if (tmdbId) {
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

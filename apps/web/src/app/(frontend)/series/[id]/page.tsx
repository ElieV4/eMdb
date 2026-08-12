/**
 * Page détail d'une série.
 * Redirige vers la page titre générique en conservant le type série.
 *
 * Route : /series/:id
 * Correspondance backend : Phase 3 - Pages de détail
 */

"use client";

import { notFound } from "next/navigation";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { TitleHero } from "@/components/titles/TitleHero";
import { TitleInfo } from "@/components/titles/TitleInfo";
import { TitleCreditsSplit } from "@/components/titles/TitleCreditsSplit";
import { TitleRecommendations } from "@/components/titles/TitleRecommendations";
import { SeasonCompact } from "@/components/seasons/SeasonCompact";
import { TitleActions } from "@/components/titles/TitleActions";
import { useTitle } from "@/hooks/api/useTitles";
import { useTitleCredits } from "@/hooks/api/useTitleCredits";
import { useTitleRecommendations } from "@/hooks/api/useTitleRecommendations";
import { useSeasons } from "@/hooks/api/useSeasons";
import { useSerieProgress } from "@/hooks/api/useSerieProgress";
import { useAuthStore } from "@/store/authStore";

export default function SeriesDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const { isAuthenticated } = useAuthStore();

  const { data: title, isLoading, isError } = useTitle(id);
  const {
    data: credits,
    isLoading: isCreditsLoading,
    isError: isCreditsError,
  } = useTitleCredits(id);
  const {
    data: recommendations,
    isLoading: isRecsLoading,
    isError: isRecsError,
  } = useTitleRecommendations(id);
  const {
    data: seasons,
    isLoading: isSeasonsLoading,
    isError: isSeasonsError,
  } = useSeasons(id);
  const { data: serieProgress } = useSerieProgress(id, { enabled: isAuthenticated });
  const progressBySeason = new Map((serieProgress ?? []).map((p) => [p.saison, p]));

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-12">
        <LoadingSpinner className="mx-auto" />
      </div>
    );
  }

  if (isError || !title || title.type !== "serie") {
    return notFound();
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <div className="space-y-10">
        {/* Hero */}
        <TitleHero title={title} />

        {/* Actions utilisateur */}
        <TitleActions titleId={id} type={title.type} releaseDate={title.date_sortie} />

        {/* Métadonnées */}
        <TitleInfo title={title} />

        {/* Distribution (crédits) */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Distribution & Équipe</h2>
          {isCreditsLoading ? (
            <LoadingSpinner className="h-6 w-6" />
          ) : isCreditsError || !credits ? (
            <p className="text-sm text-muted-foreground">
              Aucun crédit disponible pour ce titre.
            </p>
          ) : (
            <TitleCreditsSplit credits={credits} titleType={title.type} />
          )}
        </section>

        {/* Saisons */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Saisons</h2>
          {isSeasonsLoading ? (
            <LoadingSpinner className="h-6 w-6" />
          ) : isSeasonsError || !seasons || seasons.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune saison disponible pour cette série.
            </p>
          ) : (
            <div className="space-y-3">
              {seasons.map((season) => (
                <SeasonCompact
                  key={season.id}
                  season={season}
                  titleId={id}
                  progress={progressBySeason.get(season.numero)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Recommendations */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Recommandations</h2>
          {isRecsLoading ? (
            <LoadingSpinner className="h-6 w-6" />
          ) : isRecsError ||
            !recommendations ||
            recommendations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune recommandation disponible pour ce titre.
            </p>
          ) : (
            <TitleRecommendations recommendations={recommendations} />
          )}
        </section>
      </div>
    </div>
  );
}

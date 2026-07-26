/**
 * Carrousel horizontal de titres recommandés.
 * Réutilise TitleCard avec le mapping titleRecommendationToSearchResult.
 */

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  TitleRecommendation,
  titleRecommendationToSearchResult,
} from "@/lib/types/api";
import { cn } from "@/lib/utils";
import { TitleCard } from "./TitleCard";

interface TitleRecommendationsProps {
  recommendations: TitleRecommendation[];
  className?: string;
}

export function TitleRecommendations({
  recommendations,
  className,
}: TitleRecommendationsProps) {
  if (!recommendations || recommendations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        Aucune recommandation disponible pour ce titre.
      </p>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <h3 className="text-lg font-semibold">Titres recommandés</h3>

      <div className="relative">
        <div className="flex overflow-x-auto gap-4 pb-2 scrollbar-hide">
          {recommendations.map((rec) => (
            <div key={rec.id} className="shrink-0 w-40">
              <TitleCard
                title={titleRecommendationToSearchResult(rec)}
                compact
                showType={false}
              />
            </div>
          ))}
        </div>

        {/* Navigation (indique la possibilité de scroll) */}
        <div className="flex justify-end gap-2 mt-2">
          <Link
            href={`/search?query=${encodeURIComponent(
              recommendations[0]?.titre_vo ?? "",
            )}`}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Voir plus de recommandations
          </Link>
        </div>
      </div>
    </div>
  );
}

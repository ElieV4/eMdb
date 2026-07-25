/**
 * Page détail d'un titre (film ou série).
 * Phase 3 - À implémenter dans la phase suivante.
 * 
 * Correspondance backend : GET /titles/:id
 */

import { notFound } from "next/navigation";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useTitle } from "@/hooks/api/useTitles";

export default function TitleDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { data: title, isLoading, isError } = useTitle(params.id);

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-12">
        <LoadingSpinner className="mx-auto" />
      </div>
    );
  }

  if (isError || !title) {
    return notFound();
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">{title.titre}</h1>
        <p className="text-muted-foreground">
          {title.type === "film" ? "Film" : "Série"} • {title.dateSortie?.split("-")[0]}
        </p>
        <p className="text-sm">{title.synopsis}</p>
      </div>
    </div>
  );
}

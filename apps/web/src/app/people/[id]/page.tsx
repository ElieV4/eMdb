/**
 * Page détail d'une personne.
 * Phase 3 - À implémenter dans la phase suivante.
 * 
 * Correspondance backend : GET /people/:id
 */

import { notFound } from "next/navigation";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { usePerson } from "@/hooks/api/usePeople";

export default function PersonDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { data: person, isLoading, isError } = usePerson(params.id);

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-12">
        <LoadingSpinner className="mx-auto" />
      </div>
    );
  }

  if (isError || !person) {
    return notFound();
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">{person.nom}</h1>
        {person.dateNaissance && (
          <p className="text-muted-foreground">
            Né(e) le {new Date(person.dateNaissance).toLocaleDateString()}
          </p>
        )}
        <p className="text-sm">{person.biographie}</p>
      </div>
    </div>
  );
}

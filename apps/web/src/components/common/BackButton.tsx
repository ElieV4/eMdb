/**
 * Bouton "page précédente" (icône seule, sans libellé) — navigue dans
 * l'historique du navigateur plutôt que vers une route fixe, contrairement
 * aux liens "Retour à la série"/"Retour à la saison" déjà présents sur les
 * pages épisode/saison, qui pointent vers un parent connu et gardent donc
 * leur libellé.
 */

"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function BackButton({ className }: { className?: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      aria-label="Page précédente"
      className={cn(
        "inline-flex items-center justify-center rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      <ArrowLeft className="h-5 w-5" />
    </button>
  );
}

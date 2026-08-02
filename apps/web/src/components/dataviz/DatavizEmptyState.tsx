/**
 * État vide/erreur partagé par les graphiques dataviz configurables
 * (modification W, passe "config indépendante par graphique").
 */

import { BarChart3 } from "lucide-react";

export function DatavizEmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border-2 border-dashed p-8 text-center text-muted-foreground">
      <BarChart3 className="mx-auto h-12 w-12 mb-4 opacity-50" />
      <p>{message}</p>
    </div>
  );
}

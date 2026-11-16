/**
 * Libellés des modes de partage d'une liste (cf. ShareMode). La matrice des
 * droits elle-même vit côté API (apps/api/src/lists/list-permissions.ts) ;
 * le front n'utilise que les `capabilities` renvoyées par l'API pour
 * afficher ou masquer les actions.
 */

import { ShareMode } from "@/lib/types/api";

export const SHARE_MODE_OPTIONS: Array<{
  value: ShareMode;
  label: string;
  description: string;
}> = [
  {
    value: "lecture",
    label: "Lecture",
    description: "Les membres voient la liste, sans pouvoir la modifier.",
  },
  {
    value: "collaboratif",
    label: "Collaboratif",
    description:
      "Les membres peuvent aussi réordonner, changer les statuts et renommer la liste.",
  },
  {
    value: "ouvert",
    label: "Ouvert",
    description: "Les membres peuvent aussi ajouter et retirer des titres.",
  },
];

export const SHARE_MODE_LABELS: Record<ShareMode, string> = {
  lecture: "Lecture",
  collaboratif: "Collaboratif",
  ouvert: "Ouvert",
};

/** Types de liste personnels, jamais partageables (refusés par l'API). */
export function isShareableListType(type: string): boolean {
  return type !== "watchlist" && type !== "favoris";
}

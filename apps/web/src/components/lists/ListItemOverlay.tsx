/**
 * Boutons superposés en haut à gauche d'une affiche dans une liste :
 * - "Vu dans la liste" (liste partagée) : un seul état pour tous les
 *   membres ; modifiable selon les droits, sinon simple indicateur ;
 * - "Ranger" : choisir les sous-groupes du titre.
 *
 * Rendu en frère du <Link> de TitleCard (un bouton ne peut pas être imbriqué
 * dans un <a>), comme le menu d'actions rapides.
 */

"use client";

import { Eye, EyeOff, FolderTree, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

type ListItemOverlayProps = {
  titre: string;
  showVu: boolean;
  vu: boolean;
  vuBy?: string;
  canEdit: boolean;
  onToggleVu: () => void;
  showRanger: boolean;
  onRanger: () => void;
  /** Bouton commentaires (perso + fil de la liste) ; absent si non fourni. */
  onComments?: () => void;
  /** Nombre de commentaires à signaler sur le bouton (fil + avis + le mien). */
  commentCount?: number;
};

export function ListItemOverlay({
  titre,
  showVu,
  vu,
  vuBy,
  canEdit,
  onToggleVu,
  showRanger,
  onRanger,
  onComments,
  commentCount = 0,
}: ListItemOverlayProps) {
  if (!showVu && !showRanger && !onComments) return null;

  const vuLabel = vu
    ? `Vu dans la liste${vuBy ? ` (marqué par ${vuBy})` : ""}`
    : "Pas encore vu dans la liste";

  return (
    <div className="absolute top-2 left-2 z-30 flex flex-col gap-1">
      {showVu &&
        (canEdit ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onToggleVu();
            }}
            aria-pressed={vu}
            aria-label={`${vu ? "Marquer comme pas vu" : "Marquer comme vu"} dans la liste : ${titre}`}
            title={vuLabel}
            className={cn(
              "rounded-full p-1.5 transition-colors",
              vu
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-background/90 border text-muted-foreground hover:text-foreground",
            )}
          >
            {vu ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </button>
        ) : (
          vu && (
            <span
              title={vuLabel}
              aria-label={`${titre} : ${vuLabel}`}
              className="rounded-full bg-emerald-600 p-1.5 text-white"
            >
              <Eye className="h-3.5 w-3.5" />
            </span>
          )
        ))}
      {showRanger && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onRanger();
          }}
          aria-label={`Ranger dans des sous-groupes : ${titre}`}
          title="Ranger dans des sous-groupes"
          className="rounded-full border bg-background/90 p-1.5 text-muted-foreground hover:text-foreground"
        >
          <FolderTree className="h-3.5 w-3.5" />
        </button>
      )}
      {onComments && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onComments();
          }}
          aria-label={`Commentaires : ${titre}${commentCount > 0 ? ` (${commentCount})` : ""}`}
          title="Commentaires"
          className={cn(
            "relative rounded-full border p-1.5 transition-colors",
            commentCount > 0
              ? "bg-primary text-white border-primary"
              : "bg-background/90 text-muted-foreground hover:text-foreground",
          )}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          {commentCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-background px-1 text-[10px] font-medium text-foreground border">
              {commentCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
}

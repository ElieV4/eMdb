/**
 * Actions de gestion d'une liste : "Modifier la liste" (nom/description),
 * "Modifier le contenu" (navigation ou bascule du mode édition selon le
 * contexte) et "Supprimer la liste" — absent pour les listes système
 * (Watchlist/Favoris), qui n'exposent que "Modifier le contenu".
 *
 * Deux présentations :
 * - `variant="icon"` : bouton "⋮" (ListCard, sur /lists) — rendu en frère
 *   du `<Link>` de la carte, jamais imbriqué dedans (un bouton ne peut pas
 *   être un descendant d'un `<a>`, cf. TitleQuickActionsMenu).
 * - `variant="buttons"` : rangée de boutons explicites (en-tête de
 *   /lists/:id, où l'espace le permet).
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, Pencil, ListVideo, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ListDialog } from "./ListDialog";
import { useDeleteList } from "@/hooks/api/useDeleteList";
import { cn } from "@/lib/utils";

type ListActionsMenuProps = {
  list: {
    id: string;
    nom: string;
    type: "watchlist" | "favoris" | "custom";
    description?: string | null;
  };
  variant?: "icon" | "buttons";
  /** Si fourni, remplace la navigation par défaut vers /lists/:id (utilisé
   * sur /lists/:id elle-même pour basculer un mode édition inline plutôt
   * que de "naviguer vers soi-même"). */
  onEditContent?: () => void;
  /** Appelé après suppression réussie (ex: rediriger vers /lists depuis la page détail). */
  onDeleted?: () => void;
  className?: string;
};

export function ListActionsMenu({
  list,
  variant = "icon",
  onEditContent,
  onDeleted,
  className,
}: ListActionsMenuProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const deleteList = useDeleteList();
  const isCustom = list.type === "custom";

  const handleEditContent = () => {
    setMenuOpen(false);
    if (onEditContent) onEditContent();
    else router.push(`/lists/${list.id}`);
  };

  const handleConfirmDelete = () => {
    deleteList.mutate(list.id, {
      onSuccess: () => {
        setConfirmDeleteOpen(false);
        onDeleted?.();
      },
    });
  };

  const deleteDialog = (
    <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer la liste ?</AlertDialogTitle>
          <AlertDialogDescription>
            « {list.nom} » et tout son contenu seront définitivement supprimés.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleConfirmDelete}>
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  const editDialog = <ListDialog open={editOpen} onOpenChange={setEditOpen} list={list} />;

  if (variant === "buttons") {
    return (
      <>
        <div className={cn("flex items-center gap-2", className)}>
          {isCustom && (
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" />
              Modifier la liste
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleEditContent}>
            <ListVideo className="h-4 w-4" />
            Modifier le contenu
          </Button>
          {isCustom && (
            <Button variant="outline" size="sm" onClick={() => setConfirmDeleteOpen(true)}>
              <Trash2 className="h-4 w-4" />
              Supprimer la liste
            </Button>
          )}
        </div>
        {editDialog}
        {deleteDialog}
      </>
    );
  }

  // variant === "icon" — uniquement les listes personnalisées (cf. ListCard,
  // pas de "⋮" sur les cartes Watchlist/Favoris sur /lists).
  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              onClick={(e) => e.preventDefault()}
              className={cn(
                "flex items-center justify-center rounded-full bg-background/90 border p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors",
                className,
              )}
              aria-label="Actions de la liste"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => {
              setMenuOpen(false);
              setEditOpen(true);
            }}
            className="cursor-pointer"
          >
            <Pencil className="mr-2 h-4 w-4" />
            Modifier la liste
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleEditContent} className="cursor-pointer">
            <ListVideo className="mr-2 h-4 w-4" />
            Modifier le contenu
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setMenuOpen(false);
              setConfirmDeleteOpen(true);
            }}
            variant="destructive"
            className="cursor-pointer"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Supprimer la liste
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {editDialog}
      {deleteDialog}
    </>
  );
}

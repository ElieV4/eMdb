/**
 * Bouton crayon des pages qui listent des titres (page liste, watchlist,
 * historique) : ouvre un menu avec « Configurer la liste » (listes
 * personnalisées seulement) et « Modifier le contenu ».
 */

"use client";

import { useState } from "react";
import { ListChecks, Pencil, Settings2, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type EditMenuButtonProps = {
  /** Absent : pas d'entrée « Configurer la liste » (historique, watchlist, favoris). */
  onConfigure?: () => void;
  onEditContent: () => void;
  /** Mode « Modifier le contenu » actif : le bouton le signale et le menu propose d'en sortir. */
  editing?: boolean;
  className?: string;
};

export function EditMenuButton({
  onConfigure,
  onEditContent,
  editing = false,
  className,
}: EditMenuButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label="Modifier la liste"
            title="Modifier la liste"
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full border transition-colors",
              editing
                ? "border-primary bg-primary text-white"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
              className,
            )}
          >
            <Pencil className="h-4 w-4" />
          </button>
        }
      />
      <DropdownMenuContent align="end">
        {onConfigure && (
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => {
              setOpen(false);
              onConfigure();
            }}
          >
            <Settings2 className="mr-2 h-4 w-4" />
            Configurer la liste
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => {
            setOpen(false);
            onEditContent();
          }}
        >
          {editing ? (
            <X className="mr-2 h-4 w-4" />
          ) : (
            <ListChecks className="mr-2 h-4 w-4" />
          )}
          {editing ? "Terminer la modification" : "Modifier le contenu"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Items de dropdown pour choisir une date de visionnage (modification M) —
 * partagés entre WatchButton (état non-vu + sous-menu "Revoir") et
 * TitleQuickActionsMenu ("Marquer comme vu"), pour garantir exactement le
 * même choix de dates aux deux endroits ("même dropdown que sur le clic
 * prolongé du bouton du même nom", selon la demande utilisateur).
 * Ne rend que des `<DropdownMenuItem>` — à placer dans un
 * `DropdownMenuContent` ou `DropdownMenuSubContent` par l'appelant.
 */

import { Clock, ListChecks, CalendarCheck, CalendarClock, HelpCircle } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { WatchDateSelection } from "@/lib/watchDates";

type WatchDateMenuItemsProps = {
  /** "Vu" pour un premier visionnage, "Revu" pour un re-visionnage. */
  labelPrefix: "Vu" | "Revu";
  /** Date de sortie du titre/épisode — masque l'option si absente. */
  releaseDate?: string | null;
  /** N'affiche "…jusqu'ici" que dans un contexte épisode. */
  showUntilHere?: boolean;
  onSelect: (selection: WatchDateSelection) => void;
};

export function WatchDateMenuItems({
  labelPrefix,
  releaseDate,
  showUntilHere = false,
  onSelect,
}: WatchDateMenuItemsProps) {
  return (
    <>
      <DropdownMenuItem
        onClick={() => onSelect({ type: "now" })}
        className="cursor-pointer"
      >
        <Clock className="mr-2 h-4 w-4" />
        <span>{labelPrefix} à l&apos;instant</span>
      </DropdownMenuItem>
      {showUntilHere && (
        <DropdownMenuItem
          onClick={() => onSelect({ type: "until-here" })}
          className="cursor-pointer"
        >
          <ListChecks className="mr-2 h-4 w-4" />
          <span>{labelPrefix} jusqu&apos;ici</span>
        </DropdownMenuItem>
      )}
      {releaseDate && (
        <DropdownMenuItem
          onClick={() => onSelect({ type: "release" })}
          className="cursor-pointer"
        >
          <CalendarCheck className="mr-2 h-4 w-4" />
          <span>{labelPrefix} à la date de sortie</span>
        </DropdownMenuItem>
      )}
      <DropdownMenuItem
        onClick={() => onSelect({ type: "custom" })}
        className="cursor-pointer"
      >
        <CalendarClock className="mr-2 h-4 w-4" />
        <span>{labelPrefix} à une autre date...</span>
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={() => onSelect({ type: "unknown" })}
        className="cursor-pointer"
      >
        <HelpCircle className="mr-2 h-4 w-4" />
        <span>{labelPrefix} à une date inconnue</span>
      </DropdownMenuItem>
    </>
  );
}

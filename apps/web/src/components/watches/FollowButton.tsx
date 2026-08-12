/**
 * Bouton "Suivre" / "Ne plus suivre" pour une série.
 *
 * Phase 4.4 — Follows
 */

"use client";

import { useState } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { useFollow } from "@/hooks/api/useFollow";
import { useUnfollow } from "@/hooks/api/useUnfollow";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/auth/useAuth";

type FollowButtonProps = {
  titleId: string;
  initialFollowed?: boolean;
  className?: string;
  /** Bouton icône seule (label accessible mais visuellement masqué) — contexte compact, ex. sous l'affiche du TitleHero. */
  compact?: boolean;
};

export function FollowButton({
  titleId,
  initialFollowed = false,
  className,
  compact = false,
}: FollowButtonProps) {
  const { user } = useAuth();
  const follow = useFollow();
  const unfollow = useUnfollow();
  const [followed, setFollowed] = useState(initialFollowed);

  if (!user) {
    return null;
  }

  const toggle = async () => {
    try {
      if (followed) {
        await unfollow.mutateAsync(titleId);
        setFollowed(false);
      } else {
        await follow.mutateAsync(titleId);
        setFollowed(true);
      }
    } catch {
      // erreur gérée par React Query
    }
  };

  if (follow.isPending || unfollow.isPending) {
    return <Skeleton className={compact ? "h-8 w-8" : "h-9 w-32"} />;
  }

  const label = followed ? "Ne plus suivre" : "Suivre";

  return (
    <Button
      variant={followed ? "outline" : "default"}
      size={compact ? "icon" : "default"}
      aria-label={label}
      onClick={toggle}
      className={className}
    >
      {compact ? (
        followed ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />
      ) : (
        label
      )}
    </Button>
  );
}

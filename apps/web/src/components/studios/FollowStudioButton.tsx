/**
 * Bouton "Suivre" / "Ne plus suivre" pour un studio — simple bookmark
 * (contrairement au suivi d'une personne, pas d'auto-ajout des futurs
 * titres à la watchlist : un studio n'a pas d'équivalent TMDB
 * "combined credits" pour détecter ça sans scan coûteux).
 */

"use client";

import { useEffect, useState } from "react";
import { useFollowStudio, useUnfollowStudio } from "@/hooks/api/useStudio";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/auth/useAuth";

type FollowStudioButtonProps = {
  studioId: string;
  initialFollowed?: boolean;
  className?: string;
};

export function FollowStudioButton({
  studioId,
  initialFollowed = false,
  className,
}: FollowStudioButtonProps) {
  const { user } = useAuth();
  const follow = useFollowStudio();
  const unfollow = useUnfollowStudio();
  const [followed, setFollowed] = useState(initialFollowed);

  // cf. FollowButton.tsx : `initialFollowed` arrive souvent après le
  // montage (requête parente pas encore résolue) — sans resync, le bouton
  // reste figé sur "Suivre" et un clic redonde en 409 côté serveur.
  useEffect(() => {
    setFollowed(initialFollowed);
  }, [initialFollowed]);

  if (!user) {
    return null;
  }

  const toggle = async () => {
    try {
      if (followed) {
        await unfollow.mutateAsync(studioId);
        setFollowed(false);
      } else {
        await follow.mutateAsync(studioId);
        setFollowed(true);
      }
    } catch {
      // erreur gérée par React Query
    }
  };

  if (follow.isPending || unfollow.isPending) {
    return <Skeleton className="h-9 w-32" />;
  }

  return (
    <Button
      variant={followed ? "outline" : "default"}
      onClick={toggle}
      className={className}
    >
      {followed ? "Ne plus suivre" : "Suivre"}
    </Button>
  );
}

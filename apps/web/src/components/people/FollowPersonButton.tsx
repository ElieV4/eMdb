/**
 * Bouton "Suivre" / "Ne plus suivre" pour une personne.
 *
 * Suivre une personne ajoute automatiquement ses futurs titres (annoncés,
 * pas encore sortis) à la watchlist — cf. checkFollowedPersonsForNewTitles
 * (cron quotidien du worker).
 */

"use client";

import { useState } from "react";
import { useFollowPerson } from "@/hooks/api/useFollowPerson";
import { useUnfollowPerson } from "@/hooks/api/useUnfollowPerson";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/auth/useAuth";

type FollowPersonButtonProps = {
  personId: string;
  initialFollowed?: boolean;
  className?: string;
};

export function FollowPersonButton({
  personId,
  initialFollowed = false,
  className,
}: FollowPersonButtonProps) {
  const { user } = useAuth();
  const follow = useFollowPerson();
  const unfollow = useUnfollowPerson();
  const [followed, setFollowed] = useState(initialFollowed);

  if (!user) {
    return null;
  }

  const toggle = async () => {
    try {
      if (followed) {
        await unfollow.mutateAsync(personId);
        setFollowed(false);
      } else {
        await follow.mutateAsync(personId);
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

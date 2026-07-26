/**
 * Bouton "Suivre" / "Ne plus suivre" pour une série.
 *
 * Phase 4.4 — Follows
 */

"use client";

import { useState } from "react";
import { useFollow } from "@/hooks/api/useFollow";
import { useUnfollow } from "@/hooks/api/useUnfollow";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/auth/useAuth";

type FollowButtonProps = {
  titleId: string;
  initialFollowed?: boolean;
  className?: string;
};

export function FollowButton({ titleId, initialFollowed = false, className }: FollowButtonProps) {
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
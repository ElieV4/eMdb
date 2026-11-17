/**
 * Résultat de la confirmation d'email (/verify-email?token=...) : l'appel
 * part dès l'ouverture du lien, sans action de l'utilisateur.
 */

"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useVerifyEmail } from "@/hooks/auth/useVerifyEmail";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function VerifyEmailStatus({ token }: { token?: string }) {
  const { data, error, isPending } = useVerifyEmail(token);

  if (!token) {
    return (
      <p className="text-center text-sm text-destructive">Lien de confirmation invalide.</p>
    );
  }

  if (isPending) {
    return (
      <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Confirmation en cours...
      </p>
    );
  }

  return (
    <div className="space-y-4 text-center">
      {error ? (
        <p className="text-sm text-destructive">
          {error.message} Vous pouvez demander un nouveau lien depuis la page de connexion.
        </p>
      ) : (
        <p className="text-sm">{data?.message}</p>
      )}
      <Link href="/login" className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
        Retour à la connexion
      </Link>
    </div>
  );
}

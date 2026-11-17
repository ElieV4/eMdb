/**
 * Page de réinitialisation du mot de passe, ouverte depuis le lien reçu par
 * email (/reset-password?token=...).
 */

import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams?: { token?: string };
}) {
  const token = searchParams?.token;

  return (
    <>
      <div className="text-center">
        <h1 className="text-2xl font-bold">Nouveau mot de passe</h1>
      </div>
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <p className="text-center text-sm text-destructive">
          Lien de réinitialisation invalide.{" "}
          <Link href="/forgot-password" className="text-primary hover:underline">
            Demander un nouveau lien
          </Link>
        </p>
      )}
    </>
  );
}

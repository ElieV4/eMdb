/**
 * Page d'inscription.
 * Affiche le formulaire RegisterForm avec lien vers la connexion.
 */

import Link from "next/link";
import { RegisterForm } from "@/components/auth/RegisterForm";

export default function RegisterPage({
  searchParams,
}: {
  searchParams?: { redirect?: string };
}) {
  const redirectTo = searchParams?.redirect || "/";

  return (
    <>
      <div className="text-center">
        <h1 className="text-2xl font-bold">Inscription</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Déjà un compte ?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Connectez-vous
          </Link>
        </p>
      </div>
      <RegisterForm redirectTo={redirectTo} />
    </>
  );
}

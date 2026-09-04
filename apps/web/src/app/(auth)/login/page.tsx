/**
 * Page de connexion.
 * Affiche le formulaire LoginForm avec lien vers l'inscription.
 */

import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { redirect?: string; demo?: string };
}) {
  const redirectTo = searchParams?.redirect || "/";
  const isDemo = searchParams?.demo === "1";

  return (
    <>
      <div className="text-center">
        <h1 className="text-2xl font-bold">Connexion</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Pas encore de compte ?{" "}
          <Link href="/register" className="text-primary hover:underline">
            Créer un compte
          </Link>
        </p>
      </div>
      <LoginForm redirectTo={redirectTo} prefillDemo={isDemo} />
    </>
  );
}

/**
 * Page "Mot de passe oublié" : demande d'un lien de réinitialisation par email.
 */

import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <>
      <div className="text-center">
        <h1 className="text-2xl font-bold">Mot de passe oublié</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Saisissez votre email : vous recevrez un lien pour choisir un nouveau mot de passe.
        </p>
      </div>
      <ForgotPasswordForm />
      <p className="text-center text-sm">
        <Link href="/login" className="text-primary hover:underline">
          Retour à la connexion
        </Link>
      </p>
    </>
  );
}

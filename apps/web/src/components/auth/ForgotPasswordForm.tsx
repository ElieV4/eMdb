/**
 * Formulaire "Mot de passe oublié" : envoie un lien de réinitialisation
 * par email. Le message de succès est volontairement le même que le compte
 * existe ou non (cf. API).
 */

"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { AuthInput } from "@/components/auth/AuthInput";
import { useForgotPassword } from "@/hooks/auth/useForgotPassword";
import { Button } from "@/components/ui/button";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const { mutate, isPending, isError, error: apiError, isSuccess, data } = useForgotPassword();

  if (isSuccess) {
    return <p className="text-center text-sm">{data.message}</p>;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("L'email est requis");
    } else if (!EMAIL_REGEX.test(email)) {
      setError("Format d'email invalide");
    } else {
      setError(undefined);
      mutate(email);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <AuthInput
        label="Email"
        name="email"
        type="email"
        value={email}
        onChange={setEmail}
        error={error}
        placeholder="vous@exemple.com"
        autoComplete="email"
        required
      />
      {isError && <p className="text-sm text-destructive">{(apiError as Error).message}</p>}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Envoi...
          </>
        ) : (
          "Envoyer le lien"
        )}
      </Button>
    </form>
  );
}

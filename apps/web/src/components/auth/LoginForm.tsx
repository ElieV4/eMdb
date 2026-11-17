/**
 * Formulaire de connexion.
 * Validation email/password, gestion des erreurs API, redirect après succès.
 */

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AuthInput } from "@/components/auth/AuthInput";
import { useLogin } from "@/hooks/auth/useLogin";
import { useResendVerification } from "@/hooks/auth/useResendVerification";
import { Button } from "@/components/ui/button";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Erreur renvoyée par l'API pour un compte dont l'email n'est pas encore
// confirmé (cf. auth.service.ts) — on propose alors de renvoyer le lien.
const UNVERIFIED_EMAIL_PATTERN = /confirmez votre adresse email/i;

export function LoginForm({
  redirectTo = "/",
  prefillDemo = false,
}: {
  redirectTo?: string;
  /** Arrivée depuis /register via "Essayer avec un compte de démo" — préremplit
   * les identifiants du compte test@test, l'utilisateur clique lui-même sur
   * "Se connecter". */
  prefillDemo?: boolean;
}) {
  const [email, setEmail] = useState(prefillDemo ? "test@test.com" : "");
  const [password, setPassword] = useState(prefillDemo ? "test" : "");
  const [staySignedIn, setStaySignedIn] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const router = useRouter();
  const { mutate, isPending, isError, error, isSuccess } = useLogin();
  const resend = useResendVerification();

  // Redirect on success
  useEffect(() => {
    if (isSuccess) {
      router.push(redirectTo);
    }
  }, [isSuccess, router, redirectTo]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!email) {
      newErrors.email = "L'email est requis";
    } else if (!EMAIL_REGEX.test(email)) {
      newErrors.email = "Format d'email invalide";
    }
    if (!password) {
      newErrors.password = "Le mot de passe est requis";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      mutate({ email, password, staySignedIn });
    }
  };

  const apiError = isError ? (error as Error)?.message : undefined;
  const isUnverified = !!apiError && UNVERIFIED_EMAIL_PATTERN.test(apiError);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <AuthInput
        label="Email"
        name="email"
        type="email"
        value={email}
        onChange={setEmail}
        error={errors.email}
        placeholder="vous@exemple.com"
        autoComplete="email"
        required
      />
      <AuthInput
        label="Mot de passe"
        name="password"
        type="password"
        value={password}
        onChange={setPassword}
        error={errors.password}
        placeholder="••••••••"
        autoComplete="current-password"
        required
      />
      <div className="-mt-2 text-right">
        <Link href="/forgot-password" className="text-sm text-primary hover:underline">
          Mot de passe oublié ?
        </Link>
      </div>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={staySignedIn}
          onChange={(e) => setStaySignedIn(e.target.checked)}
          className="h-4 w-4 rounded border-input accent-primary"
        />
        Rester connecté
      </label>
      {apiError && <p className="text-sm text-destructive">{apiError}</p>}
      {isUnverified &&
        (resend.isSuccess ? (
          <p className="text-sm text-muted-foreground">{resend.data.message}</p>
        ) : (
          <button
            type="button"
            onClick={() => resend.mutate(email)}
            disabled={resend.isPending}
            className="text-sm text-primary hover:underline disabled:opacity-50"
          >
            {resend.isPending ? "Envoi..." : "Renvoyer l'email de confirmation"}
          </button>
        ))}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Connexion...
          </>
        ) : (
          "Se connecter"
        )}
      </Button>
    </form>
  );
}

/**
 * Formulaire d'inscription.
 * Validation email/pseudo/password/confirm, gestion des erreurs API, redirect après succès.
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AuthInput } from "@/components/auth/AuthInput";
import { useRegister } from "@/hooks/auth/useRegister";
import { Button } from "@/components/ui/button";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function RegisterForm({ redirectTo = "/" }: { redirectTo?: string }) {
  const [email, setEmail] = useState("");
  const [pseudo, setPseudo] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const router = useRouter();
  const { mutate, isPending, isError, error, isSuccess } = useRegister();

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

    if (!pseudo) {
      newErrors.pseudo = "Le pseudo est requis";
    } else if (pseudo.length < 3) {
      newErrors.pseudo = "Le pseudo doit contenir au moins 3 caractères";
    } else if (pseudo.length > 30) {
      newErrors.pseudo = "Le pseudo ne peut pas dépasser 30 caractères";
    }

    if (!password) {
      newErrors.password = "Le mot de passe est requis";
    } else if (password.length < 8) {
      newErrors.password =
        "Le mot de passe doit contenir au moins 8 caractères";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "La confirmation est requise";
    } else if (confirmPassword !== password) {
      newErrors.confirmPassword = "Les mots de passe ne correspondent pas";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      mutate({ email, pseudo, password });
    }
  };

  const apiError = isError ? (error as Error)?.message : undefined;

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
        label="Pseudo"
        name="pseudo"
        type="text"
        value={pseudo}
        onChange={setPseudo}
        error={errors.pseudo}
        placeholder="VotrePseudo"
        autoComplete="username"
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
        autoComplete="new-password"
        required
      />
      <AuthInput
        label="Confirmer le mot de passe"
        name="confirmPassword"
        type="password"
        value={confirmPassword}
        onChange={setConfirmPassword}
        error={errors.confirmPassword}
        placeholder="••••••••"
        autoComplete="new-password"
        required
      />
      {apiError && <p className="text-sm text-destructive">{apiError}</p>}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Création du compte...
          </>
        ) : (
          "Créer le compte"
        )}
      </Button>
    </form>
  );
}

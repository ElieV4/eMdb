/**
 * Formulaire de connexion.
 * Validation email/password, gestion des erreurs API, redirect après succès.
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AuthInput } from "@/components/auth/AuthInput";
import { useLogin } from "@/hooks/auth/useLogin";
import { Button } from "@/components/ui/button";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginForm({ redirectTo = "/" }: { redirectTo?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const router = useRouter();
  const { mutate, isPending, isError, error, isSuccess } = useLogin();

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
      mutate({ email, password });
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
      {apiError && <p className="text-sm text-destructive">{apiError}</p>}
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

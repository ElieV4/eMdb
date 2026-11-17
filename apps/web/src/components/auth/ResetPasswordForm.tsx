/**
 * Formulaire de nouveau mot de passe, ouvert depuis le lien reçu par email
 * (/reset-password?token=...).
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { AuthInput } from "@/components/auth/AuthInput";
import { useResetPassword } from "@/hooks/auth/useResetPassword";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { mutate, isPending, isError, error, isSuccess, data } = useResetPassword();

  if (isSuccess) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm">{data.message}</p>
        <Link href="/login" className={cn(buttonVariants(), "w-full")}>
          Se connecter
        </Link>
      </div>
    );
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!password) {
      newErrors.password = "Le mot de passe est requis";
    } else if (password.length < 8) {
      newErrors.password = "Le mot de passe doit contenir au moins 8 caractères";
    }
    if (confirmPassword !== password) {
      newErrors.confirmPassword = "Les mots de passe ne correspondent pas";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      mutate({ token, password });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <AuthInput
        label="Nouveau mot de passe"
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
      {isError && (
        <p className="text-sm text-destructive">
          {(error as Error).message}{" "}
          <Link href="/forgot-password" className="text-primary hover:underline">
            Demander un nouveau lien
          </Link>
        </p>
      )}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Enregistrement...
          </>
        ) : (
          "Changer le mot de passe"
        )}
      </Button>
    </form>
  );
}

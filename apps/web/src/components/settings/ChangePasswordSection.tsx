/**
 * Section "Mot de passe" des paramètres : changement du mot de passe de
 * l'utilisateur connecté (mot de passe actuel requis).
 */

"use client";

import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { AuthInput } from "@/components/auth/AuthInput";
import { useChangePassword } from "@/hooks/auth/useChangePassword";
import { Button } from "@/components/ui/button";

export function ChangePasswordSection() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const changePassword = useChangePassword();

  const reset = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setErrors({});
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!currentPassword) {
      newErrors.currentPassword = "Le mot de passe actuel est requis";
    }
    if (!newPassword) {
      newErrors.newPassword = "Le nouveau mot de passe est requis";
    } else if (newPassword.length < 8) {
      newErrors.newPassword = "Le mot de passe doit contenir au moins 8 caractères";
    }
    if (confirmPassword !== newPassword) {
      newErrors.confirmPassword = "Les mots de passe ne correspondent pas";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    changePassword.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          reset();
          setIsOpen(false);
        },
      },
    );
  };

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <KeyRound className="h-5 w-5 text-primary" />
        Mot de passe
      </h2>
      {changePassword.isSuccess && !isOpen && (
        <p className="text-sm text-muted-foreground">{changePassword.data.message}</p>
      )}
      {isOpen ? (
        <form onSubmit={handleSubmit} className="max-w-sm space-y-4">
          <AuthInput
            label="Mot de passe actuel"
            name="currentPassword"
            type="password"
            value={currentPassword}
            onChange={setCurrentPassword}
            error={errors.currentPassword}
            autoComplete="current-password"
            required
          />
          <AuthInput
            label="Nouveau mot de passe"
            name="newPassword"
            type="password"
            value={newPassword}
            onChange={setNewPassword}
            error={errors.newPassword}
            autoComplete="new-password"
            required
          />
          <AuthInput
            label="Confirmer le nouveau mot de passe"
            name="confirmNewPassword"
            type="password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            error={errors.confirmPassword}
            autoComplete="new-password"
            required
          />
          {changePassword.isError && (
            <p className="text-sm text-destructive">{changePassword.error.message}</p>
          )}
          <div className="flex gap-2">
            <Button type="submit" disabled={changePassword.isPending}>
              {changePassword.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                changePassword.reset();
                setIsOpen(false);
              }}
              disabled={changePassword.isPending}
            >
              Annuler
            </Button>
          </div>
        </form>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            changePassword.reset();
            setIsOpen(true);
          }}
        >
          <KeyRound className="mr-2 h-4 w-4" />
          Modifier mon mot de passe
        </Button>
      )}
    </section>
  );
}

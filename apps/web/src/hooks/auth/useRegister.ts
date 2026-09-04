/**
 * Mutation React Query pour /auth/register.
 * Le compte créé reste "en attente" (status='pending') jusqu'à validation
 * manuelle par l'admin — contrairement à l'ancien flux, l'inscription ne
 * connecte plus automatiquement (pas de tokens retournés par l'API).
 */

import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";

export type RegisterInput = {
  email: string;
  pseudo: string;
  password: string;
};

export type RegisterResult = {
  status: "pending";
  message: string;
};

export function useRegister() {
  return useMutation({
    mutationFn: (input: RegisterInput) =>
      apiFetch<RegisterResult>("/auth/register", {
        method: "POST",
        body: input,
      }),
  });
}

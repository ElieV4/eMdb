/**
 * Changement de mot de passe depuis les paramètres (utilisateur connecté) :
 * POST /auth/change-password. Un mot de passe actuel erroné renvoie un 400
 * (pas un 401, qui déclencherait refresh + déconnexion dans apiClient).
 *
 * Le changement invalide toutes les sessions ouvertes (les jetons de
 * rafraîchissement portent l'empreinte du mot de passe) : l'API renvoie de
 * nouveaux jetons pour la session courante, enregistrés ici comme après une
 * connexion.
 */

import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";
import { useAuthStore } from "@/store/authStore";
import { setAuthCookie, setRefreshCookie } from "@/lib/auth/authCookie";

export type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
};

type ChangePasswordResponse = {
  message: string;
  accessToken: string;
  refreshToken: string;
};

export function useChangePassword() {
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const setRefreshToken = useAuthStore((s) => s.setRefreshToken);

  return useMutation({
    mutationFn: (input: ChangePasswordInput) =>
      apiFetch<ChangePasswordResponse>("/auth/change-password", {
        method: "POST",
        body: input,
      }),
    onSuccess: (data) => {
      setAccessToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      setAuthCookie(data.accessToken);
      setRefreshCookie(data.refreshToken);
    },
  });
}

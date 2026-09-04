/**
 * Enregistre le device courant pour les notifications push (FCM), uniquement
 * quand l'app tourne dans le wrapper Capacitor natif (no-op sur le web
 * classique, où PushNotifications n'a pas d'implémentation).
 *
 * Gère aussi le tap sur une notification reçue (foreground ou background) :
 * redirige vers le titre concerné.
 */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { apiFetch } from "@/lib/api/apiClient";
import { useAuthStore } from "@/store/authStore";

export function useRegisterPushToken() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated || !Capacitor.isNativePlatform()) return;

    let cancelled = false;

    const register = async () => {
      const permission = await PushNotifications.checkPermissions();
      let granted = permission.receive === "granted";

      if (!granted && permission.receive !== "denied") {
        const requested = await PushNotifications.requestPermissions();
        granted = requested.receive === "granted";
      }
      if (!granted || cancelled) return;

      await PushNotifications.register();
    };

    register().catch((error) => {
      console.warn("[push] Échec de l'enregistrement des notifications :", error);
    });

    const registrationListener = PushNotifications.addListener("registration", (token) => {
      apiFetch("/push/register", {
        method: "POST",
        body: { token: token.value, platform: "android" },
      }).catch((error) => {
        console.warn("[push] Échec de l'envoi du token au backend :", error);
      });
    });

    const actionListener = PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      const titleId = action.notification.data?.title_id;
      if (titleId) router.push(`/titles/${titleId}`);
    });

    return () => {
      cancelled = true;
      registrationListener.then((listener) => listener.remove());
      actionListener.then((listener) => listener.remove());
    };
  }, [isAuthenticated, router]);
}

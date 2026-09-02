/**
 * Configuration globale React Query (TanStack Query).
 *
 * Règles :
 - staleTime 5min, gcTime 10min.
 - Refetch au focus fenêtre.
 - Retry 1 (pas de retry sur 4xx).
 - Cache hors SSR par défaut.
 - Toute mutation qui échoue affiche un toast d'erreur (cf. MutationCache
 - ci-dessous) — avant ce fix, aucun des hooks de mutation (marquer vu,
 - suivre, noter, listes...) n'avait de gestion d'erreur, et il n'existait
 - aucun mécanisme global : un échec (timeout, 500, redémarrage à froid
 - Render...) ne produisait strictement aucun retour visible, donnant
 - l'impression trompeuse que le clic n'avait rien fait ("le bouton ne
 - marche pas"). Les erreurs de *lecture* (queries) ne sont pas concernées
 - ici : la plupart des pages affichent déjà leur propre état d'erreur
 - inline, un toast en plus ferait doublon.
 */

import { MutationCache, QueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";

export const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error) => {
      toast.add({
        title: "Une action a échoué",
        description: error instanceof Error ? error.message : "Erreur inconnue.",
        type: "error",
      });
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: (failureCount, error) => {
        if (error instanceof Error) {
          const status = (error as Error & { status?: number }).status;
          if (status && status >= 400 && status < 500) return false;
        }
        return failureCount < 1;
      },
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false,
    },
  },
});

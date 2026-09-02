/**
 * Layout racine de l’application.
 * Providers : React Query + thème.
 * Cache la Sidebar/Header/Footer sur les pages d'auth (login, register).
 */

"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/api/queryClient";
import { useAuthBootstrap } from "@/hooks/auth/useAuthBootstrap";
import { SettingsSync } from "@/components/settings/SettingsSync";
import { Toaster } from "@/components/ui/toast";
import "@/styles/globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useAuthBootstrap();

  return (
    <html lang="fr" className="dark">
      <body>
        <QueryClientProvider client={queryClient}>
          <Toaster>
            <SettingsSync />
            {children}
          </Toaster>
        </QueryClientProvider>
      </body>
    </html>
  );
}

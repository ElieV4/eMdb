/**
 * Page paramètres : préférences d'affichage (taille de police, taille des
 * affiches), accessible depuis Profil.
 * Persistées en localStorage (store settingsStore) — pas de synchronisation
 * serveur, purement un confort d'affichage local à l'appareil.
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Type, Image as ImageIcon, Upload, Trash2 } from "lucide-react";
import { useSettingsStore, SizePreference } from "@/store/settingsStore";
import { useDeleteAccount } from "@/hooks/api/useDeleteAccount";
import { useAuthStore } from "@/store/authStore";
import { clearAuthCookie, clearRefreshCookie } from "@/lib/auth/authCookie";
import { TraktImportButton } from "@/components/profile/TraktImportButton";
import { ImportCreditsButton } from "@/components/profile/ImportCreditsButton";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const SIZE_OPTIONS: { value: SizePreference; label: string }[] = [
  { value: "petit", label: "Petit" },
  { value: "moyen", label: "Moyen" },
  { value: "grand", label: "Grand" },
];

function SizeSelector({
  value,
  onChange,
}: {
  value: SizePreference;
  onChange: (value: SizePreference) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg border p-1 w-fit">
      {SIZE_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
            value === option.value
              ? "bg-primary text-white"
              : "text-muted-foreground hover:bg-muted",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const fontSize = useSettingsStore((s) => s.fontSize);
  const posterSize = useSettingsStore((s) => s.posterSize);
  const setFontSize = useSettingsStore((s) => s.setFontSize);
  const setPosterSize = useSettingsStore((s) => s.setPosterSize);
  const logout = useAuthStore((s) => s.logout);
  const deleteAccount = useDeleteAccount();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const handleDeleteAccount = () => {
    deleteAccount.mutate(undefined, {
      onSuccess: () => {
        logout();
        clearAuthCookie();
        clearRefreshCookie();
        router.push("/login");
      },
    });
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="space-y-8">
        <div>
          <Link
            href="/profile"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au profil
          </Link>
          <h1 className="text-2xl font-bold mt-4">Paramètres</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Préférences d&apos;affichage, enregistrées sur cet appareil.
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Type className="h-5 w-5 text-primary" />
            Taille de la police
          </h2>
          <p className="text-sm text-muted-foreground">
            S&apos;applique à l&apos;ensemble de l&apos;application.
          </p>
          <SizeSelector value={fontSize} onChange={setFontSize} />
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            Taille des affiches
          </h2>
          <p className="text-sm text-muted-foreground">
            S&apos;applique aux affiches de titres dans les pages et modules.
          </p>
          <SizeSelector value={posterSize} onChange={setPosterSize} />
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Import
          </h2>
          <p className="text-sm text-muted-foreground">
            Importez votre historique de visionnage, vos notes et votre
            watchlist depuis un export Trakt (.zip).
          </p>
          <div className="flex flex-wrap gap-2">
            <TraktImportButton />
            <ImportCreditsButton />
          </div>
        </section>

        <section className="space-y-3 border-t pt-8">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Zone de danger
          </h2>
          <p className="text-sm text-muted-foreground">
            Supprime définitivement votre compte et toutes les données
            associées (visionnages, notes, listes, favoris, séries suivies).
            Cette action est irréversible.
          </p>
          <Button
            type="button"
            variant="destructive"
            onClick={() => setConfirmDeleteOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Supprimer mon compte
          </Button>
        </section>
      </div>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer définitivement le compte ?</AlertDialogTitle>
            <AlertDialogDescription>
              Toutes vos données (visionnages, notes, listes, favoris, séries
              suivies) seront supprimées sans possibilité de retour en
              arrière.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteAccount.isPending}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleteAccount.isPending}
            >
              {deleteAccount.isPending ? "Suppression..." : "Supprimer définitivement"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/**
 * Page paramètres : préférences d'affichage (taille de police, taille des
 * affiches), accessible depuis Profil.
 * Persistées en localStorage (store settingsStore) — pas de synchronisation
 * serveur, purement un confort d'affichage local à l'appareil.
 */

"use client";

import Link from "next/link";
import { ArrowLeft, Type, Image as ImageIcon } from "lucide-react";
import { useSettingsStore, SizePreference } from "@/store/settingsStore";
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
  const fontSize = useSettingsStore((s) => s.fontSize);
  const posterSize = useSettingsStore((s) => s.posterSize);
  const setFontSize = useSettingsStore((s) => s.setFontSize);
  const setPosterSize = useSettingsStore((s) => s.setPosterSize);

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
      </div>
    </div>
  );
}

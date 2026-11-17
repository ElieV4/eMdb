/**
 * Choix d'un emoji (listes, groupes, sous-groupes) : une grille d'emojis
 * courants, un champ libre pour en coller un autre, et « Aucun ».
 */

"use client";

import { useState } from "react";
import { SmilePlus, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export const COMMON_EMOJIS = [
  "🎬", "🍿", "📺", "🎞️", "⭐", "❤️", "🔥", "👍",
  "😂", "😱", "😢", "🥰", "🤯", "😴", "👻", "💀",
  "🚀", "🛸", "🧙", "🦸", "🕵️", "🤖", "🐉", "🧟",
  "⚽", "🎾", "🏀", "🥊", "🏎️", "🎵", "🎨", "📚",
  "🌍", "🗽", "🗼", "🏝️", "🎄", "🎃", "👶", "👨‍👩‍👧",
  "🍝", "🍷", "☕", "💰", "⚔️", "🔫", "🏆", "✅",
];

type EmojiPickerProps = {
  value: string | null;
  onChange: (emoji: string | null) => void;
  /** Libellé du bouton (lecteurs d'écran). */
  label?: string;
  className?: string;
};

export function EmojiPicker({ value, onChange, label = "Choisir un emoji", className }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");

  const pick = (emoji: string | null) => {
    onChange(emoji);
    setCustom("");
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label={value ? `${label} (actuel : ${value})` : label}
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-md border text-lg hover:bg-muted",
              className,
            )}
          >
            {value ?? <SmilePlus className="h-4 w-4 text-muted-foreground" />}
          </button>
        }
      />
      <DropdownMenuContent align="start" className="w-72 p-2">
        <div role="listbox" aria-label="Emojis" className="grid grid-cols-8 gap-1">
          {COMMON_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              role="option"
              aria-selected={value === emoji}
              aria-label={emoji}
              onClick={() => pick(emoji)}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded text-lg hover:bg-muted",
                value === emoji && "bg-primary/20",
              )}
            >
              {emoji}
            </button>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-1 border-t pt-2">
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter" && custom.trim()) {
                e.preventDefault();
                pick(custom.trim().slice(0, 16));
              }
            }}
            placeholder="Autre emoji…"
            aria-label="Autre emoji"
            maxLength={16}
            className="h-8 min-w-0 flex-1 rounded-md border bg-transparent px-2 text-sm"
          />
          <button
            type="button"
            disabled={!custom.trim()}
            onClick={() => pick(custom.trim().slice(0, 16))}
            className="h-8 rounded-md border px-2 text-xs hover:bg-muted disabled:opacity-50"
          >
            OK
          </button>
          {value && (
            <button
              type="button"
              onClick={() => pick(null)}
              aria-label="Aucun emoji"
              className="flex h-8 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:bg-muted"
            >
              <X className="h-3.5 w-3.5" />
              Aucun
            </button>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Nom précédé de l'emoji, s'il y en a un. */
export function withEmoji(nom: string, emoji?: string | null): string {
  return emoji ? `${emoji} ${nom}` : nom;
}

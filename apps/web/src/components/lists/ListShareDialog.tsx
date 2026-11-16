/**
 * Dialogue de partage d'une liste, réservé à son créateur :
 * - choix du mode de partage, appliqué à tous les membres ;
 * - liste des membres, avec retrait ;
 * - ajout d'un membre par pseudo (ou email exact).
 */

"use client";

import { useState } from "react";
import { X, UserPlus } from "lucide-react";
import { useShareList } from "@/hooks/api/useShareList";
import { useShares } from "@/hooks/api/useShares";
import { useRemoveShare } from "@/hooks/api/useRemoveShare";
import { useUpdateShareMode } from "@/hooks/api/useUpdateShareMode";
import { useSearchUsers } from "@/hooks/api/useSearchUsers";
import { useDebounce } from "@/hooks/ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SHARE_MODE_OPTIONS } from "@/lib/shareModes";
import { ShareMode } from "@/lib/types/api";
import { cn } from "@/lib/utils";

type ListShareDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  list: { id: string; nom: string; share_mode: ShareMode };
};

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

export function ListShareDialog({ open, onOpenChange, list }: ListShareDialogProps) {
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const debouncedQuery = useDebounce(query, 300);

  const { data: members = [], isLoading: membersLoading } = useShares(list.id, open);
  const { data: results = [], isFetching: searching } = useSearchUsers(
    open ? debouncedQuery : "",
  );
  const shareList = useShareList();
  const removeShare = useRemoveShare();
  const updateShareMode = useUpdateShareMode();

  const memberIds = new Set(members.map((m) => m.shared_with_user_id));
  const candidates = results.filter((user) => !memberIds.has(user.id));
  const hasQuery = debouncedQuery.trim().length >= 2 || debouncedQuery.includes("@");

  const handleModeChange = (shareMode: ShareMode) => {
    if (shareMode === list.share_mode) return;
    setError("");
    updateShareMode.mutate(
      { listId: list.id, shareMode },
      { onError: (err) => setError(errorMessage(err, "Impossible de changer le mode.")) },
    );
  };

  const handleAdd = (userId: string) => {
    setError("");
    shareList.mutate(
      { listId: list.id, data: { shared_with_user_id: userId } },
      {
        onSuccess: () => setQuery(""),
        onError: (err) => setError(errorMessage(err, "Erreur lors du partage.")),
      },
    );
  };

  const handleRemove = (userId: string) => {
    setError("");
    removeShare.mutate(
      { listId: list.id, userId },
      { onError: (err) => setError(errorMessage(err, "Impossible de retirer ce membre.")) },
    );
  };

  // Mode affiché : celui en cours d'envoi, sinon celui de la liste.
  const currentMode = updateShareMode.isPending
    ? (updateShareMode.variables?.shareMode ?? list.share_mode)
    : list.share_mode;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Partager « {list.nom} »</DialogTitle>
          <DialogDescription>
            Le mode choisi s&apos;applique à tous les membres. Vous seul pouvez supprimer la
            liste, gérer les membres et changer le mode.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium mb-2">Droits des membres</legend>
            <div role="radiogroup" aria-label="Mode de partage" className="grid gap-2">
              {SHARE_MODE_OPTIONS.map((option) => {
                const selected = currentMode === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={updateShareMode.isPending}
                    onClick={() => handleModeChange(option.value)}
                    className={cn(
                      "rounded-md border px-3 py-2 text-left transition-colors",
                      selected ? "border-primary bg-primary/10" : "hover:bg-muted",
                    )}
                  >
                    <span className="block text-sm font-medium">{option.label}</span>
                    <span className="block text-xs text-muted-foreground">
                      {option.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="space-y-2">
            <p className="text-sm font-medium">
              Membres{members.length > 0 ? ` (${members.length})` : ""}
            </p>
            {membersLoading ? (
              <p className="text-sm text-muted-foreground">Chargement…</p>
            ) : members.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Cette liste n&apos;est encore partagée avec personne.
              </p>
            ) : (
              <ul className="divide-y rounded-md border">
                {members.map((member) => (
                  <li
                    key={member.shared_with_user_id}
                    className="flex items-center justify-between px-3 py-2 text-sm"
                  >
                    <span>{member.users.pseudo}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Retirer ${member.users.pseudo}`}
                      disabled={removeShare.isPending}
                      onClick={() => handleRemove(member.shared_with_user_id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="share-user-query">Ajouter un membre</Label>
            <Input
              id="share-user-query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pseudo, ou adresse email complète"
              autoComplete="off"
            />
            {hasQuery && (
              <ul className="max-h-40 overflow-auto rounded-md border">
                {candidates.length === 0 ? (
                  <li className="px-3 py-2 text-sm text-muted-foreground">
                    {searching ? "Recherche…" : "Aucun utilisateur trouvé."}
                  </li>
                ) : (
                  candidates.map((user) => (
                    <li key={user.id}>
                      <button
                        type="button"
                        disabled={shareList.isPending}
                        onClick={() => handleAdd(user.id)}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
                      >
                        <span>{user.pseudo}</span>
                        <UserPlus className="h-4 w-4 text-muted-foreground" aria-hidden />
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

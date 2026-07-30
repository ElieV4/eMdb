/**
 * Dialog de partage d'une liste avec un utilisateur.
 *
 * Phase 4.3 — Lists
 */

"use client";

import { useState, useEffect } from "react";
import { useShareList } from "@/hooks/api/useShareList";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ListShareDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listId: string;
  listName: string;
};

type UserOption = {
  id: string;
  pseudo: string;
};

export function ListShareDialog({
  open,
  onOpenChange,
  listId,
  listName,
}: ListShareDialogProps) {
  const [query, setQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [permission, setPermission] = useState<"lecture" | "edition">(
    "lecture",
  );
  const [users, setUsers] = useState<UserOption[]>([]);
  const [error, setError] = useState("");

  const shareList = useShareList();

  useEffect(() => {
    if (query.trim().length >= 2) {
      // TODO: intégrer un vrai endpoint de recherche utilisateurs
      setUsers([]);
    }
  }, [query]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!selectedUserId) {
      setError("Veuillez sélectionner un utilisateur.");
      return;
    }

    try {
      await shareList.mutateAsync({
        listId,
        data: { shared_with_user_id: selectedUserId, permission },
      });
      onOpenChange(false);
      setQuery("");
      setSelectedUserId("");
      setPermission("lecture");
    } catch {
      setError("Erreur lors du partage.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Partager "{listName}"</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user-query">Rechercher un utilisateur</Label>
            <Input
              id="user-query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pseudo ou email..."
            />
            {users.length > 0 && (
              <ul className="border rounded-md max-h-40 overflow-auto">
                {users.map((user) => (
                  <li
                    key={user.id}
                    className="px-3 py-2 hover:bg-accent cursor-pointer"
                    onClick={() => setSelectedUserId(user.id)}
                  >
                    {user.pseudo}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="permission">Permission</Label>
            <select
              id="permission"
              value={permission}
              onChange={(e) =>
                setPermission(e.target.value as "lecture" | "edition")
              }
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="lecture">Lecture</option>
              <option value="edition">Édition</option>
            </select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={shareList.isPending}>
              Partager
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

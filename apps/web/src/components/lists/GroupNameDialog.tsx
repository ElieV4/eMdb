/**
 * Petit dialogue de saisie du nom d'un sous-groupe (création ou renommage).
 */

"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type GroupNameDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initialName: string;
  submitLabel: string;
  onSubmit: (nom: string) => Promise<void>;
};

export function GroupNameDialog({
  open,
  onOpenChange,
  title,
  initialName,
  submitLabel,
  onSubmit,
}: GroupNameDialogProps) {
  const [nom, setNom] = useState(initialName);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (open) {
      setNom(initialName);
      setError("");
    }
  }, [open, initialName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) return;
    setPending(true);
    setError("");
    try {
      await onSubmit(nom.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="group-name">Nom</Label>
            <Input
              id="group-name"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              maxLength={100}
              autoFocus
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={pending || !nom.trim()}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Sélecteur de date pour "Vu/Revu à une autre date..." (modification M) —
 * remplace le `window.prompt()` utilisé jusqu'ici (pas un vrai sélecteur).
 */

"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type WatchDatePickerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  onConfirm: (dateIso: string) => void;
};

export function WatchDatePickerDialog({
  open,
  onOpenChange,
  title = "Choisir une date",
  onConfirm,
}: WatchDatePickerDialogProps) {
  const [value, setValue] = useState(() => new Date().toISOString().slice(0, 10));

  const handleConfirm = () => {
    if (!value) return;
    onConfirm(new Date(`${value}T00:00:00`).toISOString());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="watch-date-picker">Date du visionnage</Label>
          <Input
            id="watch-date-picker"
            type="date"
            value={value}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleConfirm} disabled={!value}>
            Confirmer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

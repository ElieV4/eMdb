/**
 * Mon commentaire perso sur un titre (user_ratings.commentaire) : affiché,
 * et modifiable sur place. Vide = pas de commentaire.
 */

"use client";

import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSaveMyComment } from "@/hooks/api/useComments";

type MyCommentEditorProps = {
  titleId: string;
  value: string | null | undefined;
  /** Texte d'aide sous le titre de la section (ex. visibilité). */
  hint?: string;
};

export function MyCommentEditor({ titleId, value, hint }: MyCommentEditorProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [error, setError] = useState("");
  const save = useSaveMyComment();

  useEffect(() => {
    if (!editing) setDraft(value ?? "");
  }, [value, editing]);

  const handleSave = () => {
    setError("");
    save.mutate(
      { titleId, commentaire: draft },
      {
        onSuccess: () => setEditing(false),
        onError: (err) => setError(err instanceof Error ? err.message : "Erreur."),
      },
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">Mon commentaire</h3>
        {!editing && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5" />
            {value ? "Modifier" : "Ajouter"}
          </Button>
        )}
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {editing ? (
        <div className="space-y-2">
          <Textarea
            aria-label="Mon commentaire"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={2000}
            rows={3}
            placeholder="Ce que vous en avez pensé…"
            autoFocus
          />
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)}>
              Annuler
            </Button>
            <Button type="button" size="sm" onClick={handleSave} disabled={save.isPending}>
              Enregistrer
            </Button>
          </div>
        </div>
      ) : value ? (
        <p className="whitespace-pre-line text-sm">{value}</p>
      ) : (
        <p className="text-sm text-muted-foreground">Pas encore de commentaire.</p>
      )}
    </div>
  );
}

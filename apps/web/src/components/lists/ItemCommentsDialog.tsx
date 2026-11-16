/**
 * Commentaires d'un titre dans une liste :
 * - mon commentaire perso (modifiable) ;
 * - liste partagée : commentaires perso des membres qui les partagent, et
 *   fil de commentaires partagés (écriture selon le mode).
 */

"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { MyCommentEditor } from "@/components/comments/MyCommentEditor";
import {
  useAddItemComment,
  useDeleteItemComment,
  useItemComments,
  useUpdateItemComment,
} from "@/hooks/api/useComments";
import { ListItemComment } from "@/lib/types/api";

type ItemCommentsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listId: string;
  isShared: boolean;
  item: {
    id: string;
    titre: string;
    myComment?: string;
    memberComments: Array<{ pseudo: string; commentaire: string }>;
  } | null;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function CommentRow({
  comment,
  listId,
  titleId,
}: {
  comment: ListItemComment;
  listId: string;
  titleId: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.contenu);
  const update = useUpdateItemComment();
  const remove = useDeleteItemComment();

  return (
    <li className="space-y-1 rounded-md border p-2">
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          <span className="font-medium text-foreground">{comment.author.pseudo}</span> ·{" "}
          {formatDate(comment.created_at)}
          {comment.updated_at !== comment.created_at && " (modifié)"}
        </span>
        <span className="flex gap-1">
          {comment.canEdit && !editing && (
            <button
              type="button"
              aria-label="Modifier mon commentaire"
              onClick={() => setEditing(true)}
              className="rounded p-1 hover:bg-muted"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          {comment.canDelete && (
            <button
              type="button"
              aria-label={`Supprimer le commentaire de ${comment.author.pseudo}`}
              onClick={() => remove.mutate({ listId, titleId, commentId: comment.id })}
              className="rounded p-1 hover:bg-muted"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </span>
      </div>
      {editing ? (
        <div className="space-y-2">
          <Textarea
            aria-label="Modifier le commentaire"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={2000}
            rows={2}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)}>
              Annuler
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!draft.trim() || update.isPending}
              onClick={() =>
                update.mutate(
                  { listId, titleId, commentId: comment.id, contenu: draft },
                  { onSuccess: () => setEditing(false) },
                )
              }
            >
              Enregistrer
            </Button>
          </div>
        </div>
      ) : (
        <p className="whitespace-pre-line text-sm">{comment.contenu}</p>
      )}
    </li>
  );
}

export function ItemCommentsDialog({ open, onOpenChange, listId, isShared, item }: ItemCommentsDialogProps) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const titleId = item?.id ?? "";
  const { data: thread, isLoading } = useItemComments(listId, titleId, open && isShared);
  const add = useAddItemComment();

  const handleAdd = () => {
    setError("");
    add.mutate(
      { listId, titleId, contenu: draft },
      {
        onSuccess: () => setDraft(""),
        onError: (err) => setError(err instanceof Error ? err.message : "Erreur."),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Commentaires · {item?.titre}</DialogTitle>
        </DialogHeader>

        {item && (
          <div className="space-y-5">
            <MyCommentEditor
              titleId={item.id}
              value={item.myComment}
              hint={
                isShared
                  ? "Commentaire perso, le même sur la page du titre et dans l'historique. Visible des membres seulement si vous l'avez activé dans les réglages."
                  : undefined
              }
            />

            {isShared && item.memberComments.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Avis des membres</h3>
                <ul className="space-y-2">
                  {item.memberComments.map((c) => (
                    <li key={c.pseudo} className="rounded-md bg-muted/50 p-2 text-sm">
                      <span className="font-medium">{c.pseudo}</span>
                      <p className="whitespace-pre-line">{c.commentaire}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {isShared && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Discussion de la liste</h3>
                {isLoading ? (
                  <p className="text-sm text-muted-foreground">Chargement…</p>
                ) : (thread?.comments.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun commentaire pour l&apos;instant.</p>
                ) : (
                  <ul className="space-y-2">
                    {thread?.comments.map((c) => (
                      <CommentRow key={c.id} comment={c} listId={listId} titleId={item.id} />
                    ))}
                  </ul>
                )}
                {thread?.canWrite ? (
                  <div className="space-y-2">
                    <Textarea
                      aria-label="Nouveau commentaire de la liste"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      maxLength={2000}
                      rows={2}
                      placeholder="Écrire aux membres de la liste…"
                    />
                    {error && (
                      <p role="alert" className="text-sm text-destructive">
                        {error}
                      </p>
                    )}
                    <div className="flex justify-end">
                      <Button type="button" size="sm" onClick={handleAdd} disabled={!draft.trim() || add.isPending}>
                        Publier
                      </Button>
                    </div>
                  </div>
                ) : (
                  thread && (
                    <p className="text-xs text-muted-foreground">
                      Le mode de partage de cette liste ne permet pas de commenter.
                    </p>
                  )
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

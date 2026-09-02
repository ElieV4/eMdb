/**
 * Gestion de la whitelist des sites "gratuits" (page Paramètres) — table
 * partagée par tous les utilisateurs (pas de scoping par user). Formulaire
 * volontairement réduit à 2 champs visibles (nom + URL de recherche) —
 * retour utilisateur : la config est pensée pour être remplie via une IA à
 * qui on donne le site, pas saisie à la main champ par champ.
 */

"use client";

import { useState } from "react";
import { ChevronDown, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import {
  useFreeWatchSites,
  useCreateFreeWatchSite,
  useUpdateFreeWatchSite,
  useDeleteFreeWatchSite,
  useTestFreeWatchSite,
} from "@/hooks/api";
import { FreeWatchSite } from "@/lib/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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

type FormState = {
  nom: string;
  url_recherche: string;
  url_directe: string;
  selecteur_resultat: string;
};

const EMPTY_FORM: FormState = { nom: "", url_recherche: "", url_directe: "", selecteur_resultat: "" };

function SiteForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial: FreeWatchSite | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(
    initial
      ? {
          nom: initial.nom,
          url_recherche: initial.url_recherche,
          url_directe: initial.url_directe ?? "",
          selecteur_resultat: initial.selecteur_resultat ?? "",
        }
      : EMPTY_FORM,
  );
  const [showAdvanced, setShowAdvanced] = useState(!!(initial?.url_directe || initial?.selecteur_resultat));
  const [testTitle, setTestTitle] = useState("Inception");
  const [testType, setTestType] = useState<"film" | "serie">("film");

  const create = useCreateFreeWatchSite();
  const update = useUpdateFreeWatchSite();
  const test = useTestFreeWatchSite();

  const canSubmit = form.nom.trim() && form.url_recherche.trim();
  const isSaving = create.isPending || update.isPending;

  const handleTest = () => {
    if (!form.url_recherche.trim() || !testTitle.trim()) return;
    test.mutate({
      url_recherche: form.url_recherche,
      url_directe: form.url_directe || undefined,
      selecteur_resultat: form.selecteur_resultat || undefined,
      titreVo: testTitle,
      type: testType,
    });
  };

  const handleSave = () => {
    if (!canSubmit) return;
    const data = {
      nom: form.nom.trim(),
      url_recherche: form.url_recherche.trim(),
      url_directe: form.url_directe.trim() || null,
      selecteur_resultat: form.selecteur_resultat.trim() || null,
    };
    if (initial) {
      update.mutate({ id: initial.id, data }, { onSuccess: onSaved });
    } else {
      create.mutate(data, { onSuccess: onSaved });
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label className="text-sm font-medium">Nom</label>
        <Input
          value={form.nom}
          onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
          placeholder="Ex. MovieDB Wiki"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">URL de recherche</label>
        <Input
          value={form.url_recherche}
          onChange={(e) => setForm((f) => ({ ...f, url_recherche: e.target.value }))}
          placeholder="https://exemple.com/?s={query}"
        />
        <p className="text-xs text-muted-foreground">
          {"{query}"} sera remplacé par le titre recherché (encodé automatiquement).
        </p>
      </div>

      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showAdvanced && "rotate-180")} />
        Avancé (optionnel)
      </button>

      {showAdvanced && (
        <div className="space-y-3 rounded-md border p-3">
          <div className="space-y-1">
            <label className="text-xs font-medium">URL devinée (essai rapide avant la recherche)</label>
            <Input
              value={form.url_directe}
              onChange={(e) => setForm((f) => ({ ...f, url_directe: e.target.value }))}
              placeholder="https://exemple.com/{type}/{slug}/"
            />
            <p className="text-xs text-muted-foreground">
              {"{slug}"} = titre normalisé, {"{type}"} = "movie" ou "series".
            </p>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Sélecteur CSS des résultats</label>
            <Input
              value={form.selecteur_resultat}
              onChange={(e) => setForm((f) => ({ ...f, selecteur_resultat: e.target.value }))}
              placeholder="article.TPost"
            />
            <p className="text-xs text-muted-foreground">
              Sans ça, heuristique générique (tout lien contenant une image).
            </p>
          </div>
        </div>
      )}

      <div className="space-y-2 rounded-md border p-3">
        <label className="text-xs font-medium">Tester sur un titre</label>
        <div className="flex flex-wrap gap-2">
          <Input
            value={testTitle}
            onChange={(e) => setTestTitle(e.target.value)}
            placeholder="Titre à chercher"
            className="max-w-[200px]"
          />
          <div className="flex rounded-lg border p-1">
            {(["film", "serie"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTestType(t)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium",
                  testType === t ? "bg-primary text-white" : "text-muted-foreground",
                )}
              >
                {t === "film" ? "Film" : "Série"}
              </button>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleTest}
            disabled={!form.url_recherche.trim() || !testTitle.trim() || test.isPending}
          >
            {test.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Tester"}
          </Button>
        </div>
        {test.data && (
          <p className={cn("text-sm", test.data.found ? "text-primary" : "text-muted-foreground")}>
            {test.data.found
              ? `Trouvé (${test.data.matchedBy}) : ${test.data.url}`
              : "Rien trouvé pour ce titre."}
          </p>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="button" onClick={handleSave} disabled={!canSubmit || isSaving}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Enregistrer
        </Button>
      </DialogFooter>
    </div>
  );
}

export function FreeWatchSitesSection() {
  const { data: sites, isLoading } = useFreeWatchSites();
  const updateSite = useUpdateFreeWatchSite();
  const deleteSite = useDeleteFreeWatchSite();
  const [editing, setEditing] = useState<FreeWatchSite | "new" | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : !sites || sites.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun site configuré.</p>
      ) : (
        <div className="space-y-2">
          {sites.map((site) => (
            <div
              key={site.id}
              className="flex items-center justify-between gap-2 rounded-md border p-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{site.nom}</p>
                <p className="truncate text-xs text-muted-foreground">{site.url_recherche}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant={site.actif ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => updateSite.mutate({ id: site.id, data: { actif: !site.actif } })}
                >
                  {site.actif ? "Actif" : "Inactif"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Modifier"
                  onClick={() => setEditing(site)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Supprimer"
                  onClick={() => setConfirmDeleteId(site.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Button type="button" variant="outline" size="sm" onClick={() => setEditing("new")}>
        <Plus className="mr-2 h-4 w-4" />
        Ajouter un site
      </Button>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "Ajouter un site" : "Modifier le site"}</DialogTitle>
            <DialogDescription>
              Un site "gratuit" whitelisté pour la recherche de liens de streaming libre.
            </DialogDescription>
          </DialogHeader>
          {editing !== null && (
            <SiteForm
              initial={editing === "new" ? null : editing}
              onCancel={() => setEditing(null)}
              onSaved={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDeleteId !== null} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce site ?</AlertDialogTitle>
            <AlertDialogDescription>
              Il ne sera plus consulté pour la recherche de liens gratuits.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (confirmDeleteId) deleteSite.mutate(confirmDeleteId);
                setConfirmDeleteId(null);
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

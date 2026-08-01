/**
 * Déduplique un objet groupé par rôle (`CreditGrouped`/`FilmographyGrouped`,
 * `Record<role, item[]>`) en une liste d'entités uniques (une personne ou un
 * titre), chacune portant la liste de ses rôles — pour affichage en liste
 * unique avec badges de rôle plutôt qu'en sections séparées par rôle
 * (modification C).
 */

export type DedupedEntity<T> = {
  entityId: string;
  /** Premier item rencontré pour cette entité — porte les données partagées
   * (infos personne/titre), identiques quel que soit le rôle. */
  representative: T;
  /** Un couple {role, item} par rôle tenu par cette entité — `item` garde
   * l'info spécifique au rôle (ex. `personnage` pour "Acteur"). */
  roleEntries: { role: string; item: T }[];
};

export function dedupeGroupedByEntity<T>(
  grouped: Record<string, T[]>,
  getEntityId: (item: T) => string,
): DedupedEntity<T>[] {
  const map = new Map<string, DedupedEntity<T>>();

  for (const [role, items] of Object.entries(grouped)) {
    for (const item of items) {
      const entityId = getEntityId(item);
      let entry = map.get(entityId);
      if (!entry) {
        entry = { entityId, representative: item, roleEntries: [] };
        map.set(entityId, entry);
      }
      entry.roleEntries.push({ role, item });
    }
  }

  return Array.from(map.values());
}

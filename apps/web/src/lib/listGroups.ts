/**
 * Utilitaires pour les sous-groupes d'une liste, renvoyés à plat par l'API
 * (`parent_id`) et affichés en arbre.
 */

import { ListGroup } from "@/lib/types/api";

export type GroupNode = ListGroup & { depth: number; path: string };

/**
 * Aplatit l'arbre en ordre d'affichage (parent puis ses enfants), avec la
 * profondeur et le chemin ("Sport › Tennis"). Un groupe dont le parent est
 * introuvable est traité comme racine.
 */
export function flattenGroupTree(groups: ListGroup[]): GroupNode[] {
  const ids = new Set(groups.map((g) => g.id));
  const byParent = new Map<string | null, ListGroup[]>();
  for (const group of groups) {
    const parent = group.parent_id && ids.has(group.parent_id) ? group.parent_id : null;
    byParent.set(parent, [...(byParent.get(parent) ?? []), group]);
  }

  const result: GroupNode[] = [];
  const visit = (parentId: string | null, depth: number, prefix: string) => {
    const children = [...(byParent.get(parentId) ?? [])].sort(
      (a, b) => a.position - b.position || a.nom.localeCompare(b.nom),
    );
    for (const child of children) {
      const path = prefix ? `${prefix} › ${child.nom}` : child.nom;
      result.push({ ...child, depth, path });
      visit(child.id, depth + 1, path);
    }
  };
  visit(null, 0, "");
  return result;
}

/** Le groupe et tous ses descendants : un titre rangé dans Tennis apparaît dans Sport. */
export function groupWithDescendants(groups: ListGroup[], groupId: string): Set<string> {
  const result = new Set<string>([groupId]);
  let added = true;
  while (added) {
    added = false;
    for (const group of groups) {
      if (group.parent_id && result.has(group.parent_id) && !result.has(group.id)) {
        result.add(group.id);
        added = true;
      }
    }
  }
  return result;
}

/** Un titre appartient au groupe s'il est rangé dans le groupe ou un de ses descendants. */
export function itemInGroup(
  itemGroupIds: string[],
  groups: ListGroup[],
  groupId: string,
): boolean {
  const scope = groupWithDescendants(groups, groupId);
  return itemGroupIds.some((id) => scope.has(id));
}

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Convertit une chaîne en slug URL-friendly.
 * Utilisé pour les classes CSS et les IDs.
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const UUID_PREFIX_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/**
 * Construit une URL "{id}-{slug}" pour une page titre/série/personne — le
 * slug est purement cosmétique (retrouver/reconnaître une page dans
 * l'historique ou une URL partagée), l'id reste l'unique clé de résolution
 * (cf. `extractIdFromRouteParam`). Sans label, retombe sur l'id seul.
 */
export function buildEntityUrl(basePath: string, id: string, label?: string | null): string {
  const slug = label ? slugify(label) : "";
  return slug ? `${basePath}/${id}-${slug}` : `${basePath}/${id}`;
}

/**
 * Extrait l'UUID en tête d'un paramètre de route `[id]` de la forme
 * "{id}-{slug}" — tout ce qui suit est décoratif et ignoré. Rétro-compatible
 * avec les anciennes URLs sans slug (id seul, matche déjà entièrement la
 * regex) : renvoie le paramètre tel quel si aucun UUID n'est trouvé en tête
 * (ne devrait pas arriver en pratique, garde-fou).
 */
export function extractIdFromRouteParam(param: string): string {
  const match = param.match(UUID_PREFIX_RE);
  return match ? match[0] : param;
}

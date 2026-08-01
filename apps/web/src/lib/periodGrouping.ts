/**
 * Groupement par période (Jour/Semaine/Mois/Trimestre/Semestre/Année),
 * partagé entre les pages Historique et Calendrier (modification J, format
 * inspiré du widget Outlook Android).
 */

export type Period = "jour" | "semaine" | "mois" | "trimestre" | "semestre" | "annee" | "tout";

export const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "tout", label: "Tout" },
  { value: "jour", label: "Jour" },
  { value: "semaine", label: "Semaine" },
  { value: "mois", label: "Mois" },
  { value: "trimestre", label: "Trimestre" },
  { value: "semestre", label: "Semestre" },
  { value: "annee", label: "Année" },
];

const MONTH_NAMES = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Lundi de la semaine contenant `date`. */
function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = dimanche
  const diff = day === 0 ? -6 : 1 - day; // recule jusqu'au lundi
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Clé de tri stable + libellé d'affichage pour la période contenant `date`.
 */
export function getPeriodBucket(date: Date, period: Period): { key: string; label: string } {
  const year = date.getFullYear();

  switch (period) {
    case "tout":
      return { key: "tout", label: "Tout" };
    case "jour": {
      const key = `${year}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
      return { key, label: `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${year}` };
    }
    case "semaine": {
      const monday = startOfWeek(date);
      const key = `${monday.getFullYear()}-${pad2(monday.getMonth() + 1)}-${pad2(monday.getDate())}`;
      return { key, label: `Semaine du ${pad2(monday.getDate())}/${pad2(monday.getMonth() + 1)}/${monday.getFullYear()}` };
    }
    case "mois": {
      const key = `${year}-${pad2(date.getMonth() + 1)}`;
      return { key, label: `${MONTH_NAMES[date.getMonth()]} ${year}` };
    }
    case "trimestre": {
      const q = Math.floor(date.getMonth() / 3) + 1;
      return { key: `${year}-Q${q}`, label: `T${q} ${year}` };
    }
    case "semestre": {
      const s = date.getMonth() < 6 ? 1 : 2;
      return { key: `${year}-S${s}`, label: `S${s} ${year}` };
    }
    case "annee":
      return { key: `${year}`, label: `${year}` };
  }
}

/**
 * Groupe `items` par période, ordonne les groupes (plus récent en premier
 * si `descending`, sinon plus ancien en premier), et les items à l'intérieur
 * de chaque groupe dans le même ordre.
 */
export function groupByPeriod<T>(
  items: T[],
  period: Period,
  getDate: (item: T) => Date,
  descending: boolean,
): Array<{ key: string; label: string; items: T[] }> {
  const groups = new Map<string, { key: string; label: string; items: T[] }>();

  for (const item of items) {
    const { key, label } = getPeriodBucket(getDate(item), period);
    if (!groups.has(key)) groups.set(key, { key, label, items: [] });
    groups.get(key)!.items.push(item);
  }

  const result = Array.from(groups.values());
  result.sort((a, b) => (descending ? b.key.localeCompare(a.key) : a.key.localeCompare(b.key)));
  return result;
}

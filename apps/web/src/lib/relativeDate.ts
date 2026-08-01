/**
 * Formatage de date relative partagé entre Historique et Calendrier
 * (modification J) : "dans 3h" / "il y a 3h" / "hier" / "demain" /
 * "mercredi prochain" / "jeudi dernier" / au-delà d'une semaine, "jj/mm/aaaa".
 */

const DAY_NAMES = [
  "dimanche",
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatAbsoluteDate(date: Date): string {
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * @param date - date à formater
 * @param now - date de référence (par défaut l'instant présent) — paramétrable pour les tests
 */
export function formatRelativeDate(date: Date | string, now: Date = new Date()): string {
  const target = typeof date === "string" ? new Date(date) : date;
  const diffMs = target.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const dayDiff = Math.round(
    (startOfDay(target).getTime() - startOfDay(now).getTime()) / (1000 * 60 * 60 * 24),
  );

  // Même jour : granularité en heures (ou minutes si <1h)
  if (dayDiff === 0) {
    const absHours = Math.abs(diffHours);
    if (absHours < 1) {
      const diffMinutes = Math.round(diffMs / (1000 * 60));
      const absMinutes = Math.max(1, Math.abs(diffMinutes));
      return diffMinutes >= 0 ? `dans ${absMinutes}min` : `il y a ${absMinutes}min`;
    }
    const rounded = Math.round(absHours);
    return diffHours >= 0 ? `dans ${rounded}h` : `il y a ${rounded}h`;
  }

  if (dayDiff === 1) return "demain";
  if (dayDiff === -1) return "hier";

  if (dayDiff >= 2 && dayDiff <= 6) {
    return `${DAY_NAMES[target.getDay()]} prochain`;
  }
  if (dayDiff <= -2 && dayDiff >= -6) {
    return `${DAY_NAMES[target.getDay()]} dernier`;
  }

  return formatAbsoluteDate(target);
}

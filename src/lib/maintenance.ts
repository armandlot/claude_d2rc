import { DROP_CATEGORIES } from "../data/drops";
import type { SavedSession } from "./stats";

/**
 * Lit une durée saisie : « 1:02:03 », « 45:10 », « 90 » (minutes) ou « 1h30 ».
 * Renvoie des secondes, ou null si le texte n'est pas une durée.
 */
export function parseDuration(text: string): number | null {
  const t = text.trim().toLowerCase().replace(/\s+/g, "");
  if (!t) return null;
  const hm = /^(\d+)h(?:(\d{1,2})(?:m(?:in)?)?)?$/.exec(t);
  if (hm) return Number(hm[1]) * 3600 + Number(hm[2] ?? 0) * 60;
  if (/^\d+$/.test(t)) return Number(t) * 60;
  const parts = t.split(":");
  if (parts.length < 2 || parts.length > 3 || parts.some((p) => !/^\d+$/.test(p))) return null;
  const nums = parts.map(Number);
  if (nums.slice(1).some((n) => n > 59)) return null;
  return nums.reduce((acc, n) => acc * 60 + n, 0);
}

/** Problèmes empêchant d'enregistrer une session modifiée (liste vide si tout va bien). */
export function sessionErrors(s: SavedSession, known: { characters: Set<string>; routes: Set<string> }): string[] {
  const errors: string[] = [];
  if (!known.characters.has(s.characterId)) errors.push("Choisissez un personnage existant.");
  if (!known.routes.has(s.routeId)) errors.push("Choisissez une route existante.");
  if (!Number.isInteger(s.runs) || s.runs < 1) errors.push("Il faut au moins 1 run.");
  if (!(s.durationSeconds > 0)) errors.push("La durée doit être supérieure à 0.");
  if (!(s.magicFind >= 0)) errors.push("La Magic Find ne peut pas être négative.");
  if (!Number.isInteger(s.players) || s.players < 1 || s.players > 8) errors.push("/players doit être entre 1 et 8.");
  if (Number.isNaN(new Date(s.date).getTime())) errors.push("Date invalide.");
  for (const c of DROP_CATEGORIES) {
    const n = s.counts[c.kind];
    if (n !== undefined && (!Number.isInteger(n) || n < 0)) errors.push(`${c.label} : nombre entier positif attendu.`);
  }
  return errors;
}

/** Valeur pour un champ <input type="datetime-local"> (heure locale). */
export function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

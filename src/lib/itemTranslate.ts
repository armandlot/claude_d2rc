import { ITEM_NAMES } from "../data/itemCatalog";
import { ITEM_NAMES_FR_EN } from "../data/itemNames";

/** Clé de recherche : sans accents, casse, ligatures ni variantes d'apostrophe. */
export function normalizeName(s: string): string {
  return s
    .replace(/œ/gi, "oe")
    .replace(/æ/gi, "ae")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’`´]/g, "'")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const RUNES = [
  "El", "Eld", "Tir", "Nef", "Eth", "Ith", "Tal", "Ral", "Ort", "Thul", "Amn", "Sol", "Shael", "Dol", "Hel", "Io",
  "Lum", "Ko", "Fal", "Lem", "Pul", "Um", "Mal", "Ist", "Gul", "Vex", "Ohm", "Lo", "Sur", "Ber", "Jah", "Cham", "Zod",
];

/** Clé normalisée -> [nom français officiel, nom anglais]. */
const FR_TO_EN = new Map<string, [string, string]>();
for (const pair of ITEM_NAMES_FR_EN) if (!FR_TO_EN.has(normalizeName(pair[0]))) FR_TO_EN.set(normalizeName(pair[0]), pair);

const EN_NAMES = new Map<string, string>();
for (const en of [...ITEM_NAMES_FR_EN.map(([, e]) => e), ...ITEM_NAMES]) EN_NAMES.set(normalizeName(en), en);

export interface ResolvedName {
  /** Nom anglais, utilisé pour Traderie. */
  english: string;
  /** Nom français officiel (orthographe du jeu), s'il a été traduit. */
  french?: string;
  /** Le nom figure dans les textes du jeu (sinon : saisie libre, lien incertain). */
  known: boolean;
}

/** Traduit un nom saisi en français (ou déjà en anglais) vers le nom anglais du jeu. */
export function resolveItemName(input: string): ResolvedName {
  const typed = input.trim().replace(/\s+/g, " ");
  const key = normalizeName(typed);

  const fromFrench = FR_TO_EN.get(key);
  if (fromFrench) {
    const [french, english] = fromFrench;
    // Un nom identique dans les deux langues (« Shako », « Annihilus ») n'est pas une traduction.
    return normalizeName(english) === key ? { english, known: true } : { english, french, known: true };
  }

  const english = EN_NAMES.get(key);
  if (english) return { english, known: true };

  // « Ber », « rune ber », « ber rune » -> « Ber Rune ».
  const rune = RUNES.find((r) => [r, `rune ${r}`, `${r} rune`].some((v) => normalizeName(v) === key));
  if (rune) return { english: `${rune} Rune`, french: normalizeName(typed).startsWith("rune ") ? `Rune ${rune}` : undefined, known: true };

  return { english: typed, known: false };
}

/** Au moins un nom du jeu (français ou anglais) commence par ce texte : saisie en cours. */
export function isPartialName(input: string): boolean {
  const key = normalizeName(input);
  if (key.length < 2) return true;
  for (const k of FR_TO_EN.keys()) if (k.startsWith(key)) return true;
  for (const k of EN_NAMES.keys()) if (k.startsWith(key)) return true;
  return false;
}

/** Catégories de drops comptés pendant une session (avant identification). */
export type DropKind = "unique" | "set" | "rune_low" | "rune_mid" | "hr_low" | "hr_mid" | "hr_high";

export interface DropCategory {
  kind: DropKind;
  label: string;
  short: string;
  /** Runes du groupe (vide pour uniques et sets). */
  runes: string[];
  /** Raccourci clavier. */
  key: string;
}

// Groupes de runes adaptés au Ladder.
export const DROP_CATEGORIES: DropCategory[] = [
  { kind: "unique", label: "Unique", short: "Uniq.", runes: [], key: "u" },
  { kind: "set", label: "Set", short: "Set", runes: [], key: "s" },
  {
    kind: "rune_low",
    label: "Low rune",
    short: "Low",
    runes: ["El", "Eld", "Tir", "Nef", "Eth", "Ith", "Tal", "Ral", "Ort", "Thul", "Amn"],
    key: "1",
  },
  {
    kind: "rune_mid",
    label: "Mid rune",
    short: "Mid",
    runes: ["Sol", "Shael", "Dol", "Hel", "Io", "Lum", "Ko", "Fal", "Lem", "Pul", "Um"],
    key: "2",
  },
  { kind: "hr_low", label: "Low HR", short: "HR−", runes: ["Mal", "Ist", "Gul"], key: "3" },
  { kind: "hr_mid", label: "Mid HR", short: "HR", runes: ["Vex", "Ohm", "Lo"], key: "4" },
  { kind: "hr_high", label: "High HR", short: "HR+", runes: ["Sur", "Ber", "Jah", "Cham", "Zod"], key: "5" },
];

export const RUNE_KINDS: DropKind[] = ["rune_low", "rune_mid", "hr_low", "hr_mid", "hr_high"];

export const CATEGORY_BY_KIND = Object.fromEntries(DROP_CATEGORIES.map((c) => [c.kind, c])) as Record<
  DropKind,
  DropCategory
>;

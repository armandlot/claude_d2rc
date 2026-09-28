import type { Item } from "./types";

// Valeurs indicatives en runes Ist, à ajuster selon le marché (ladder / non-ladder).
export const ITEMS: Item[] = [
  { id: "rune_mid", name: "Rune Lem → Ist", quality: "rune", defaultValue: 0.4 },
  { id: "rune_high", name: "Rune Gul → Ohm", quality: "rune", defaultValue: 2.5 },
  { id: "rune_hr", name: "Haute rune (Lo → Zod)", quality: "rune", defaultValue: 8 },

  { id: "shako", name: "Harlequin Crest (Shako)", quality: "unique", defaultValue: 1 },
  { id: "arachnid", name: "Arachnid Mesh", quality: "unique", defaultValue: 2 },
  { id: "war_traveler", name: "War Traveler", quality: "unique", defaultValue: 0.5 },
  { id: "soj", name: "Stone of Jordan", quality: "unique", defaultValue: 2 },
  { id: "griffon", name: "Griffon's Eye", quality: "unique", defaultValue: 8 },
  { id: "deaths_fathom", name: "Death's Fathom", quality: "unique", defaultValue: 5 },
  { id: "crown_of_ages", name: "Crown of Ages", quality: "unique", defaultValue: 6 },
  { id: "tyrael", name: "Tyrael's Might", quality: "unique", defaultValue: 25 },
  { id: "andariel_visage", name: "Andariel's Visage", quality: "unique", defaultValue: 1.5 },

  { id: "tal_rasha_piece", name: "Pièce du set Tal Rasha", quality: "set", defaultValue: 0.3 },
  { id: "ik_piece", name: "Pièce du set Immortal King", quality: "set", defaultValue: 0.3 },

  { id: "rare_jewelry", name: "Anneau / amulette rare utile", quality: "rare", defaultValue: 0.4 },
  { id: "skiller_gc", name: "Grand charme +1 compétences", quality: "magic", defaultValue: 3 },
  { id: "eth_base", name: "Base éthérée à sertir (Thresher, Colossus…)", quality: "other", defaultValue: 0.8 },
  { id: "key", name: "Clé (Terror / Hate / Destruction)", quality: "other", defaultValue: 0.15 },
];

export const ITEMS_BY_ID: Record<string, Item> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

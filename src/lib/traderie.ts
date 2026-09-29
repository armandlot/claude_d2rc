import type { Character } from "./characters";

/**
 * Version du jeu utilisée par défaut dans les recherches Traderie.
 * Elle deviendra un champ du personnage dans une prochaine version.
 */
export const DEFAULT_GAME_VERSION = "reign of the warlock";

const BASE = "https://traderie.com/diablo2resurrected/product";

/** « Harlequin Crest » → « harlequin-crest », « Griffon's Eye » → « griffons-eye ». */
export function traderieSlug(itemName: string): string {
  return itemName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Lien vers les échanges vérifiés récents (« recent ») d'un objet, filtrés
 * sur le mode et le royaume du personnage.
 */
export function traderieUrl(
  itemName: string,
  character: Pick<Character, "ladder" | "hardcore">,
  gameVersion: string = DEFAULT_GAME_VERSION,
): string {
  const params = [
    ["prop_Mode", character.hardcore ? "hardcore" : "softcore"],
    ["prop_Ladder", String(character.ladder)],
    ["prop_Game version", gameVersion],
  ]
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  return `${BASE}/${traderieSlug(itemName)}/recent?${params}`;
}

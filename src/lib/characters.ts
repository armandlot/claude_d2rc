import { CLASSES_BY_ID, type ClassId } from "../data/classes";

export interface Character {
  id: string;
  /** Nom du personnage en jeu (facultatif). */
  name: string;
  classId: ClassId;
  spec: string;
  magicFind: number;
  /** Royaume Ladder (sinon Non-ladder). */
  ladder: boolean;
  /** Mode Hardcore (sinon Softcore). */
  hardcore: boolean;
}

/** Valeurs par défaut pour les personnages créés avant l'ajout d'un champ. */
export function normalizeCharacter(c: Partial<Character> & Pick<Character, "id" | "classId">): Character {
  return { name: "", spec: "", magicFind: 0, ...c, ladder: c.ladder ?? true, hardcore: c.hardcore ?? false };
}

/** « Ladder Softcore », « Non-ladder Hardcore »… */
export function realmLabel(c: Pick<Character, "ladder" | "hardcore">): string {
  return `${c.ladder ? "Ladder" : "Non-ladder"} ${c.hardcore ? "Hardcore" : "Softcore"}`;
}

/** Abréviation, vide pour le cas par défaut (Ladder Softcore) : « NL », « HC », « NL HC ». */
export function realmShort(c: Pick<Character, "ladder" | "hardcore">): string {
  return [c.ladder ? "" : "NL", c.hardcore ? "HC" : ""].filter(Boolean).join(" ");
}

/** « Sorcière Météorb », suivi du nom en jeu et du mode s'il n'est pas Ladder Softcore. */
export function characterLabel(c: Character): string {
  const base = `${CLASSES_BY_ID[c.classId].name} ${c.spec}`.trim();
  const extras = [c.name.trim(), realmShort(c)].filter(Boolean);
  return extras.length ? `${base} (${extras.join(", ")})` : base;
}

/** « ta Sorcière Météorb » / « ton Paladin Marteau ». */
export function characterWithPossessive(c: Character): string {
  return `${CLASSES_BY_ID[c.classId].feminine ? "ta" : "ton"} ${characterLabel(c)}`;
}

export function newCharacterId(): string {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

// Builds de la v2, convertis en personnages lors de la reprise des sessions.
const LEGACY_BUILDS: Record<string, { classId: ClassId; spec: string }> = {
  blizzard_sorc: { classId: "sorceress", spec: "Blizzard" },
  light_sorc: { classId: "sorceress", spec: "Foudre" },
  meteorb: { classId: "sorceress", spec: "Météorb" },
  hammerdin: { classId: "paladin", spec: "Marteau" },
  smiter: { classId: "paladin", spec: "Smiter" },
  javazon: { classId: "amazon", spec: "Javazon" },
  summon_necro: { classId: "necromancer", spec: "Invocation" },
  wind_druid: { classId: "druid", spec: "Vent" },
  trapsin: { classId: "assassin", spec: "Trapsin" },
  ww_barb: { classId: "barbarian", spec: "Tourbillon" },
};

interface LegacySession {
  buildId?: string;
  characterId?: string;
  magicFind: number;
}

/**
 * Convertit les sessions v2 (liées à un build) en sessions liées à un personnage,
 * en créant un personnage par build rencontré.
 */
export function migrateLegacySessions<S extends LegacySession>(
  sessions: S[],
  characters: Character[],
): { sessions: (Omit<S, "buildId"> & { characterId: string })[]; characters: Character[]; changed: boolean } {
  const created = new Map<string, Character>();
  let changed = false;
  const migrated = sessions.map((s) => {
    if (s.characterId) return s as Omit<S, "buildId"> & { characterId: string };
    changed = true;
    const buildId = s.buildId ?? "other";
    let character = created.get(buildId);
    if (!character) {
      const legacy = LEGACY_BUILDS[buildId] ?? { classId: "sorceress" as ClassId, spec: "Autre" };
      character = { id: newCharacterId() + buildId, name: "", ...legacy, magicFind: s.magicFind, ladder: true, hardcore: false };
      created.set(buildId, character);
    }
    const { buildId: _removed, ...rest } = s;
    void _removed;
    return { ...rest, characterId: character.id };
  });
  return { sessions: migrated, characters: [...characters, ...created.values()], changed };
}

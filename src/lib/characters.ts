import { CLASSES_BY_ID, type ClassId } from "../data/classes";

export interface Character {
  id: string;
  /** Nom du personnage en jeu (facultatif). */
  name: string;
  classId: ClassId;
  spec: string;
  magicFind: number;
}

/** « Sorcière Météorb », suivi du nom en jeu s'il existe. */
export function characterLabel(c: Character): string {
  const base = `${CLASSES_BY_ID[c.classId].name} ${c.spec}`.trim();
  return c.name.trim() ? `${base} (${c.name.trim()})` : base;
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
      character = { id: newCharacterId() + buildId, name: "", ...legacy, magicFind: s.magicFind };
      created.set(buildId, character);
    }
    const { buildId: _removed, ...rest } = s;
    void _removed;
    return { ...rest, characterId: character.id };
  });
  return { sessions: migrated, characters: [...characters, ...created.values()], changed };
}

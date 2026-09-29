import { describe, expect, it } from "vitest";
import {
  characterLabel,
  characterWithPossessive,
  migrateLegacySessions,
  normalizeCharacter,
  realmLabel,
  type Character,
} from "./characters";

const meteorb: Character = { id: "a", name: "", classId: "sorceress", spec: "Météorb", magicFind: 350, ladder: true, hardcore: false };
const hammer: Character = { id: "b", name: "Uther", classId: "paladin", spec: "Marteau", magicFind: 180, ladder: true, hardcore: false };

describe("libellés", () => {
  it("accorde le possessif avec la classe", () => {
    expect(characterWithPossessive(meteorb)).toBe("ta Sorcière Météorb");
    expect(characterWithPossessive(hammer)).toBe("ton Paladin Marteau (Uther)");
    expect(characterLabel(hammer)).toBe("Paladin Marteau (Uther)");
  });
});

describe("ladder / hardcore", () => {
  it("met Ladder Softcore par défaut sur les anciens personnages", () => {
    const old = normalizeCharacter({ id: "x", classId: "druid", spec: "Vent", name: "", magicFind: 200 });
    expect(old.ladder).toBe(true);
    expect(old.hardcore).toBe(false);
    expect(realmLabel(old)).toBe("Ladder Softcore");
    expect(characterLabel(old)).toBe("Druide Vent");
  });

  it("affiche le mode dans le libellé s'il n'est pas Ladder Softcore", () => {
    expect(characterLabel({ ...meteorb, ladder: false })).toBe("Sorcière Météorb (NL)");
    expect(characterLabel({ ...hammer, ladder: false, hardcore: true })).toBe("Paladin Marteau (Uther, NL HC)");
    expect(characterWithPossessive({ ...meteorb, hardcore: true })).toBe("ta Sorcière Météorb (HC)");
  });
});

describe("migrateLegacySessions", () => {
  it("crée un personnage par ancien build et relie les sessions", () => {
    const { sessions, characters, changed } = migrateLegacySessions(
      [
        { id: "1", buildId: "hammerdin", magicFind: 200 },
        { id: "2", buildId: "hammerdin", magicFind: 250 },
        { id: "3", buildId: "meteorb", magicFind: 400 },
      ],
      [],
    );
    expect(changed).toBe(true);
    expect(characters).toHaveLength(2);
    expect(characters.map((c) => c.spec).sort()).toEqual(["Marteau", "Météorb"]);
    expect(sessions[0].characterId).toBe(sessions[1].characterId);
    expect(sessions[0]).not.toHaveProperty("buildId");
  });

  it("ne touche pas aux sessions déjà migrées", () => {
    const res = migrateLegacySessions([{ id: "1", characterId: "a", magicFind: 300 }], [meteorb]);
    expect(res.changed).toBe(false);
    expect(res.characters).toEqual([meteorb]);
  });
});

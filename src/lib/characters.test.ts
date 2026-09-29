import { describe, expect, it } from "vitest";
import { characterLabel, characterWithPossessive, migrateLegacySessions, type Character } from "./characters";

const meteorb: Character = { id: "a", name: "", classId: "sorceress", spec: "Météorb", magicFind: 350 };
const hammer: Character = { id: "b", name: "Uther", classId: "paladin", spec: "Marteau", magicFind: 180 };

describe("libellés", () => {
  it("accorde le possessif avec la classe", () => {
    expect(characterWithPossessive(meteorb)).toBe("ta Sorcière Météorb");
    expect(characterWithPossessive(hammer)).toBe("ton Paladin Marteau (Uther)");
    expect(characterLabel(hammer)).toBe("Paladin Marteau (Uther)");
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

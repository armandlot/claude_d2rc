import { describe, expect, it } from "vitest";
import { ROUTES_BY_ID } from "../data/routes";
import type { Character } from "./characters";
import { emptyCounts, type RouteAggregate } from "./stats";
import { buildVerdict, type Contender } from "./verdict";

const meteorb: Character = { id: "m", name: "", classId: "sorceress", spec: "Météorb", magicFind: 350, ladder: true, hardcore: false };
const hammer: Character = { id: "h", name: "", classId: "paladin", spec: "Marteau", magicFind: 180, ladder: true, hardcore: false };

function contender(character: Character, routeId: string, uniques: number, hours: number): Contender {
  const aggregate: RouteAggregate = {
    key: `${character.id}:${routeId}`,
    characterId: character.id,
    routeId,
    sessions: 1,
    runs: 40,
    durationSeconds: hours * 3600,
    counts: { ...emptyCounts(), unique: uniques },
    mfMin: character.magicFind,
    mfMax: character.magicFind,
  };
  return { character, route: ROUTES_BY_ID[routeId], aggregate };
}

describe("buildVerdict", () => {
  it("compare deux personnages sur deux routes", () => {
    const v = buildVerdict(contender(meteorb, "terror_zone", 60, 3), contender(hammer, "chaos", 30, 3), "unique");
    expect(v.headline).toBe(
      "Avec ta Sorcière Météorb, le clear des Terror Zones est plus efficace que les runs Chaos avec ton Paladin Marteau.",
    );
    expect(v.figures).toBe("20,0 uniques/h contre 10,0 (+100 %).");
    expect(v.significant).toBe(true);
  });

  it("accorde le verbe au pluriel et omet le personnage s'il est identique", () => {
    const v = buildVerdict(contender(meteorb, "chaos", 12, 1), contender(meteorb, "pit", 10, 1), "unique");
    expect(v.headline).toBe("Avec ta Sorcière Météorb, les runs Chaos sont plus efficaces que le clear du Pit.");
    expect(v.significant).toBe(false);
  });

  it("compare deux personnages sur la même route", () => {
    const v = buildVerdict(contender(hammer, "chaos", 30, 2), contender(meteorb, "chaos", 20, 2), "unique");
    expect(v.headline).toBe("Pour les runs Chaos, ton Paladin Marteau est plus efficace que ta Sorcière Météorb.");
  });
});

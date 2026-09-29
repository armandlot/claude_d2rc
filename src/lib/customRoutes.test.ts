import { describe, expect, it } from "vitest";
import type { Character } from "./characters";
import { customRouteName, moveStop, routeIndex, toRoute, type CustomRoute } from "./customRoutes";
import { emptyCounts, type RouteAggregate } from "./stats";
import { buildVerdict } from "./verdict";

const tour: CustomRoute = { id: "custom_1", name: "", stops: ["pindleskin", "mephisto", "summoner", "andariel"] };

describe("routes custom", () => {
  it("nomme la route d'après ses étapes si aucun nom n'est donné", () => {
    expect(customRouteName(tour)).toBe("Pindleskin → Mephisto → Summoner → Andariel");
    expect(customRouteName({ ...tour, name: "  Tour MF  " })).toBe("Tour MF");
  });

  it("réordonne les étapes sans sortir des bornes", () => {
    expect(moveStop(tour.stops, 1, -1)).toEqual(["mephisto", "pindleskin", "summoner", "andariel"]);
    expect(moveStop(tour.stops, 0, -1)).toBe(tour.stops);
    expect(moveStop(tour.stops, 3, 1)).toBe(tour.stops);
  });

  it("s'ajoute aux routes classiques", () => {
    const index = routeIndex([tour]);
    expect(index.chaos.name).toBe("Chaos Sanctuary");
    expect(index.custom_1.stops).toHaveLength(4);
  });

  it("s'intègre dans une phrase de verdict", () => {
    const sorc: Character = { id: "s", name: "", classId: "sorceress", spec: "Blizzard", magicFind: 400, ladder: true, hardcore: false };
    const agg = (routeId: string, uniques: number) => ({
      key: routeId,
      characterId: "s",
      routeId,
      sessions: 1,
      runs: 30,
      durationSeconds: 3600,
    trackedSeconds: Object.fromEntries(Object.keys(emptyCounts()).map((k) => [k, 3600])) as RouteAggregate["trackedSeconds"],
      counts: { ...emptyCounts(), unique: uniques },
      mfMin: 400,
      mfMax: 400,
    });
    const v = buildVerdict(
      { character: sorc, route: toRoute({ ...tour, name: "Tour MF" }), aggregate: agg("custom_1", 20) },
      { character: sorc, route: routeIndex([]).chaos, aggregate: agg("chaos", 10) },
      "unique",
    );
    expect(v.headline).toBe("Avec ta Sorcière Blizzard, la route « Tour MF » est plus efficace que les runs Chaos.");
  });
});

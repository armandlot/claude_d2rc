import { describe, expect, it } from "vitest";
import {
  aggregateSessions,
  compareRates,
  emptyCounts,
  perHour,
  perHourMargin,
  reliability,
  runeTotal,
  summarizeEvents,
  type SavedSession,
} from "./stats";

describe("summarizeEvents", () => {
  it("compte les runs et chaque catégorie séparément", () => {
    const { runs, counts } = summarizeEvents([
      { type: "run", at: 1 },
      { type: "unique", at: 2 },
      { type: "set", at: 3 },
      { type: "unique", at: 4 },
      { type: "hr_high", at: 5 },
      { type: "run", at: 6 },
    ]);
    expect(runs).toBe(2);
    expect(counts.unique).toBe(2);
    expect(counts.set).toBe(1);
    expect(counts.hr_high).toBe(1);
    expect(runeTotal(counts)).toBe(1);
  });
});

describe("perHour", () => {
  it("convertit en taux horaire", () => {
    expect(perHour(5, 1800)).toBe(10);
    expect(perHour(5, 0)).toBe(0);
  });

  it("donne une marge qui diminue relativement avec plus de drops", () => {
    const small = perHourMargin(4, 3600) / 4;
    const large = perHourMargin(100, 3600) / 100;
    expect(large).toBeLessThan(small);
  });
});

describe("reliability", () => {
  it("dépend du nombre d'uniques + sets", () => {
    const c = emptyCounts();
    expect(reliability(c)).toBe("low");
    c.unique = 8;
    c.set = 4;
    expect(reliability(c)).toBe("medium");
    c.unique = 26;
    expect(reliability(c)).toBe("good");
  });
});

describe("aggregateSessions", () => {
  const session = (id: string, routeId: string, uniques: number, mf: number): SavedSession => ({
    id,
    date: "2026-09-29T10:00:00Z",
    characterId: "sorc",
    routeId,
    magicFind: mf,
    players: 1,
    durationSeconds: 1800,
    runs: 30,
    counts: { ...emptyCounts(), unique: uniques },
  });

  it("regroupe par personnage + route et cumule", () => {
    const groups = aggregateSessions([
      session("a", "mephisto", 3, 300),
      session("b", "mephisto", 5, 450),
      session("c", "pit", 7, 300),
    ]);
    expect(groups).toHaveLength(2);
    const meph = groups.find((g) => g.routeId === "mephisto")!;
    expect(meph.sessions).toBe(2);
    expect(meph.runs).toBe(60);
    expect(meph.durationSeconds).toBe(3600);
    expect(meph.counts.unique).toBe(8);
    expect([meph.mfMin, meph.mfMax]).toEqual([300, 450]);
  });
});

describe("compareRates", () => {
  it("calcule l'écart relatif", () => {
    const c = compareRates(30, 3600, 20, 3600);
    expect(c.rateA).toBe(30);
    expect(c.rateB).toBe(20);
    expect(c.relative).toBeCloseTo(0.5);
  });

  it("ne déclare pas significatif un écart sur peu de drops", () => {
    expect(compareRates(6, 1800, 4, 1800).significant).toBe(false);
  });

  it("déclare significatif un écart net sur beaucoup de drops", () => {
    expect(compareRates(120, 3600 * 4, 60, 3600 * 4).significant).toBe(true);
  });
});

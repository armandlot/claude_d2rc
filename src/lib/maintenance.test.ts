import { describe, expect, it } from "vitest";
import { parseDuration, sessionErrors, toLocalInput } from "./maintenance";
import { emptyCounts, type SavedSession } from "./stats";

describe("parseDuration", () => {
  it("lit les formats courants", () => {
    expect(parseDuration("1:02:03")).toBe(3723);
    expect(parseDuration("45:10")).toBe(2710);
    expect(parseDuration("90")).toBe(5400);
    expect(parseDuration("1h30")).toBe(5400);
    expect(parseDuration("2h")).toBe(7200);
    expect(parseDuration(" 1 h 05 ")).toBe(3900);
  });

  it("refuse ce qui n'est pas une durée", () => {
    expect(parseDuration("")).toBeNull();
    expect(parseDuration("abc")).toBeNull();
    expect(parseDuration("10:75")).toBeNull();
    expect(parseDuration("1:2:3:4")).toBeNull();
  });
});

describe("sessionErrors", () => {
  const known = { characters: new Set(["c"]), routes: new Set(["pit"]) };
  const ok: SavedSession = {
    id: "1",
    date: "2026-09-29T20:00:00.000Z",
    characterId: "c",
    routeId: "pit",
    magicFind: 300,
    players: 1,
    durationSeconds: 1800,
    runs: 12,
    counts: emptyCounts(),
  };

  it("accepte une session cohérente", () => {
    expect(sessionErrors(ok, known)).toEqual([]);
  });

  it("signale chaque incohérence", () => {
    const errors = sessionErrors({ ...ok, runs: 0, durationSeconds: 0, players: 9, characterId: "x", counts: { ...ok.counts, unique: -1 } }, known);
    expect(errors).toHaveLength(5);
  });
});

describe("toLocalInput", () => {
  it("formate pour un champ date et heure", () => {
    expect(toLocalInput(new Date(2026, 8, 29, 21, 5).toISOString())).toBe("2026-09-29T21:05");
  });
});

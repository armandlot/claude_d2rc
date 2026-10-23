import { describe, expect, it } from "vitest";
import { canonical, isProfileKey, mergeSnapshots, parseSnapshot, planChanges } from "./model";

const character = { id: "c1", name: "", classId: "sorceress", spec: "Blizzard", magicFind: 400, ladder: true, hardcore: false };
const session = {
  id: "s1",
  date: "2026-10-01T20:00:00.000Z",
  characterId: "c1",
  routeId: "mephisto",
  magicFind: 400,
  players: 1,
  durationSeconds: 1800,
  runs: 20,
  counts: { unique: 3, set: 1 },
  items: [{ id: "i1", name: "Harlequin Crest", nameFr: "Cimier Arlequin", value: "1 Ist" }],
};

describe("parseSnapshot", () => {
  it("accepte un état valide", () => {
    const r = parseSnapshot({ characters: [character], customRoutes: [{ id: "custom_1", name: "", stops: ["pindleskin", "mephisto"] }], sessions: [session] });
    expect(r.ok).toBe(true);
  });

  it("complète les champs facultatifs des anciens personnages", () => {
    const r = parseSnapshot({ characters: [{ id: "c", classId: "druid", spec: "Vent", magicFind: 0 }], customRoutes: [], sessions: [] });
    expect(r.ok && r.value.characters[0]).toEqual({ id: "c", name: "", classId: "druid", spec: "Vent", magicFind: 0, ladder: true, hardcore: false });
  });

  it("refuse les données invalides avec un message clair", () => {
    const bad = (patch: object) => parseSnapshot({ characters: [character], customRoutes: [], sessions: [{ ...session, ...patch }] });
    expect(bad({ players: 9 })).toEqual({ ok: false, error: "sessions[0] : MF ou /players invalide" });
    expect(bad({ counts: { unique: -1 } }).ok).toBe(false);
    expect(bad({ date: "hier" }).ok).toBe(false);
    expect(parseSnapshot({ characters: [{ ...character, classId: "necro" }], customRoutes: [], sessions: [] }).ok).toBe(false);
    expect(parseSnapshot({ characters: [character, character], customRoutes: [], sessions: [] })).toEqual({
      ok: false,
      error: "characters : identifiant en double (c1)",
    });
    expect(parseSnapshot("nope").ok).toBe(false);
  });
});

describe("isProfileKey", () => {
  it("n'accepte que des clés longues et sûres", () => {
    expect(isProfileKey("Z3x9_-abcdefghijklmnopq")).toBe(true);
    expect(isProfileKey("court")).toBe(false);
    expect(isProfileKey("aaaaaaaaaaaaaaaaaaaaaaaa'; DROP TABLE")).toBe(false);
    expect(isProfileKey(null)).toBe(false);
  });
});

describe("planChanges", () => {
  it("ne réécrit que les lignes nouvelles ou modifiées", () => {
    const existing = new Map([
      ["a", "1"],
      ["b", "2"],
      ["c", "3"],
    ]);
    const incoming = new Map([
      ["a", "1"],
      ["b", "20"],
      ["d", "4"],
    ]);
    expect(planChanges(existing, incoming)).toEqual({ upsert: ["b", "d"], remove: ["c"] });
  });

  it("compare indépendamment de l'ordre des clés", () => {
    expect(canonical({ b: 1, a: { d: [1, 2], c: null } })).toBe(canonical({ a: { c: null, d: [1, 2] }, b: 1 }));
    expect(canonical({ a: 1, b: undefined })).toBe(canonical({ a: 1 }));
  });
});

describe("mergeSnapshots", () => {
  it("réunit le compte et l'appareil, l'appareil l'emporte sur un même identifiant", () => {
    const account = {
      characters: [character, { ...character, id: "c2", name: "Hammerdin" }],
      customRoutes: [],
      sessions: [{ ...session, id: "s-old", date: "2026-01-01T10:00:00.000Z" }],
    };
    const device = {
      characters: [{ ...character, magicFind: 500 }],
      customRoutes: [{ id: "r1", name: "Pindle + Meph", stops: ["pindleskin", "mephisto"] }],
      sessions: [{ ...session, id: "s-new", date: "2026-10-01T10:00:00.000Z" }],
    };
    const merged = mergeSnapshots(account, device as typeof account);
    expect(merged.characters.map((c) => [c.id, c.magicFind])).toEqual([["c1", 500], ["c2", 400]]);
    expect(merged.customRoutes).toHaveLength(1);
    expect(merged.sessions.map((s) => s.id)).toEqual(["s-new", "s-old"]);
  });
});

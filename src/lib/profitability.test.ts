import { describe, expect, it } from "vitest";
import { BUILDS_BY_ID } from "../data/builds";
import { ITEMS_BY_ID } from "../data/items";
import { ROUTES_BY_ID } from "../data/routes";
import {
  DEFAULT_SETTINGS,
  effectiveMagicFind,
  estimateRoute,
  immuneFraction,
  magicFindMultiplier,
} from "./profitability";

const sorc = BUILDS_BY_ID.blizzard_sorc;
const meteorb = BUILDS_BY_ID.meteorb;
const hammerdin = BUILDS_BY_ID.hammerdin;

describe("effectiveMagicFind", () => {
  it("applique les rendements décroissants officiels", () => {
    expect(effectiveMagicFind(250, "unique")).toBe(125);
    expect(effectiveMagicFind(500, "set")).toBe(250);
    expect(effectiveMagicFind(600, "rare")).toBe(300);
    expect(effectiveMagicFind(400, "magic")).toBe(400);
    expect(effectiveMagicFind(400, "rune")).toBe(0);
  });

  it("vaut 1 à la MF de référence et n'affecte pas les runes", () => {
    expect(magicFindMultiplier(300, "unique")).toBeCloseTo(1);
    expect(magicFindMultiplier(0, "rune")).toBe(1);
    expect(magicFindMultiplier(600, "unique")).toBeGreaterThan(1);
  });
});

describe("immuneFraction", () => {
  it("combine les types de dégâts du build", () => {
    const chaos = ROUTES_BY_ID.chaos;
    expect(immuneFraction(sorc, chaos)).toBeCloseTo(0.2);
    expect(immuneFraction(meteorb, chaos)).toBeCloseTo(0.4 * 0.2);
    expect(immuneFraction(hammerdin, chaos)).toBe(0);
  });
});

describe("estimateRoute", () => {
  const prices = {};

  it("calcule runs/heure avec le temps de création de partie", () => {
    const est = estimateRoute(sorc, ROUTES_BY_ID.pindleskin, DEFAULT_SETTINGS, ITEMS_BY_ID, prices, 45);
    expect(est.runsPerHour).toBeCloseTo(3600 / 60);
    expect(est.valuePerHour).toBeCloseTo(est.valuePerRun * 60);
  });

  it("pénalise l'absence de téléportation, sauf avec Enigma", () => {
    const chaos = ROUTES_BY_ID.chaos;
    const without = estimateRoute(hammerdin, chaos, DEFAULT_SETTINGS, ITEMS_BY_ID, prices);
    const withEnigma = estimateRoute(hammerdin, chaos, { ...DEFAULT_SETTINGS, enigma: true }, ITEMS_BY_ID, prices);
    expect(withEnigma.runSeconds).toBeLessThan(without.runSeconds);
    expect(withEnigma.teleport).toBe(true);
  });

  it("utilise les prix personnalisés", () => {
    const route = ROUTES_BY_ID.countess;
    const base = estimateRoute(sorc, route, DEFAULT_SETTINGS, ITEMS_BY_ID, prices);
    const doubled = estimateRoute(sorc, route, DEFAULT_SETTINGS, ITEMS_BY_ID, { rune_mid: 0.8 });
    expect(doubled.valuePerRun).toBeGreaterThan(base.valuePerRun);
  });

  it("plus de MF augmente la valeur des routes à uniques", () => {
    const route = ROUTES_BY_ID.mephisto;
    const low = estimateRoute(sorc, route, { ...DEFAULT_SETTINGS, magicFind: 100 }, ITEMS_BY_ID, prices);
    const high = estimateRoute(sorc, route, { ...DEFAULT_SETTINGS, magicFind: 500 }, ITEMS_BY_ID, prices);
    expect(high.valuePerRun).toBeGreaterThan(low.valuePerRun);
  });
});

import type { Build, DamageType, Item, Quality, Route } from "../data/types";

/** MF de référence utilisée pour les chances saisies dans les données de route. */
export const REFERENCE_MF = 300;

export interface RunSettings {
  magicFind: number;
  /** Paramètre /players (1 à 8). */
  players: number;
  /** Le personnage porte Enigma (téléportation). */
  enigma: boolean;
  /** Temps de création/entrée de partie, en secondes. */
  gameOverheadSeconds: number;
}

export const DEFAULT_SETTINGS: RunSettings = {
  magicFind: 300,
  players: 1,
  enigma: false,
  gameOverheadSeconds: 15,
};

/** Prix des objets en Ist, indexés par identifiant. */
export type PriceTable = Record<string, number>;

/**
 * MF effective : rendements décroissants pour uniques, sets et rares
 * (formules officielles du jeu).
 */
export function effectiveMagicFind(mf: number, quality: Quality): number {
  if (mf <= 0) return mf;
  switch (quality) {
    case "unique":
      return (mf * 250) / (mf + 250);
    case "set":
      return (mf * 500) / (mf + 500);
    case "rare":
      return (mf * 600) / (mf + 600);
    case "magic":
      return mf;
    case "rune":
    case "other":
      return 0;
  }
}

/** Facteur appliqué aux chances de référence pour une MF donnée. */
export function magicFindMultiplier(mf: number, quality: Quality): number {
  if (quality === "rune" || quality === "other") return 1;
  return (100 + effectiveMagicFind(mf, quality)) / (100 + effectiveMagicFind(REFERENCE_MF, quality));
}

// Approximation : plus de joueurs réduit le « NoDrop » mais augmente les PV des monstres.
const PLAYERS_DROP_FACTOR = [1, 1.1, 1.25, 1.3, 1.4, 1.45, 1.5, 1.55];

export function playersDropMultiplier(players: number): number {
  const p = clamp(Math.round(players), 1, 8);
  return PLAYERS_DROP_FACTOR[p - 1];
}

export function playersTimeMultiplier(players: number, route: Route): number {
  const p = clamp(Math.round(players), 1, 8);
  return 1 + (route.kind === "boss" ? 0.06 : 0.12) * (p - 1);
}

/**
 * Part des monstres qu'un build ne peut pas tuer : un monstre n'est bloquant
 * que s'il est immunisé à tous les types de dégâts du build.
 */
export function immuneFraction(build: Build, route: Route): number {
  return build.damageTypes.reduce(
    (acc, type: DamageType) => acc * (route.immunities[type] ?? 0),
    1,
  );
}

export interface RouteEstimate {
  route: Route;
  runSeconds: number;
  runsPerHour: number;
  valuePerRun: number;
  valuePerHour: number;
  immuneFraction: number;
  teleport: boolean;
  drops: { item: Item; perRun: number; value: number }[];
}

export function estimateRunSeconds(build: Build, route: Route, settings: RunSettings): number {
  const immune = immuneFraction(build, route);
  const speed = build.speed * (build.routeAffinity?.[route.id] ?? 1);
  const teleport = build.hasTeleport || settings.enigma;
  let seconds = route.baseRunSeconds / speed;
  if (!teleport) seconds *= 1 + route.teleportDependence;
  // Les immunités ralentissent : contourner, laisser le mercenaire finir…
  seconds *= 1 + 1.5 * immune;
  seconds *= playersTimeMultiplier(settings.players, route);
  return seconds;
}

export function estimateRoute(
  build: Build,
  route: Route,
  settings: RunSettings,
  items: Record<string, Item>,
  prices: PriceTable,
  runSecondsOverride?: number,
): RouteEstimate {
  const immune = immuneFraction(build, route);
  const runSeconds =
    runSecondsOverride && runSecondsOverride > 0
      ? runSecondsOverride
      : estimateRunSeconds(build, route, settings);
  const runsPerHour = 3600 / (runSeconds + Math.max(0, settings.gameOverheadSeconds));

  // Sur une zone, les monstres immunisés sont souvent ignorés : leur butin est perdu.
  const killedShare = route.kind === "area" ? 1 - 0.8 * immune : 1;
  const playersFactor = playersDropMultiplier(settings.players);

  const drops = route.drops.flatMap((drop) => {
    const item = items[drop.itemId];
    if (!item) return [];
    const perRun =
      drop.perRun * magicFindMultiplier(settings.magicFind, item.quality) * playersFactor * killedShare;
    const price = prices[item.id] ?? item.defaultValue;
    return [{ item, perRun, value: perRun * price }];
  });

  const valuePerRun = drops.reduce((sum, d) => sum + d.value, 0);
  return {
    route,
    runSeconds,
    runsPerHour,
    valuePerRun,
    valuePerHour: valuePerRun * runsPerHour,
    immuneFraction: immune,
    teleport: build.hasTeleport || settings.enigma,
    drops,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

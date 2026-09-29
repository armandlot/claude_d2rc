import { CHARM_KINDS, DROP_CATEGORIES, RUNE_KINDS, type DropKind } from "../data/drops";

export type Counts = Record<DropKind, number>;

export type EventType = "run" | DropKind;

export interface SessionEvent {
  type: EventType;
  /** Horodatage (ms). */
  at: number;
}

export interface SessionSetup {
  characterId: string;
  routeId: string;
  magicFind: number;
  players: number;
}

/** Objet identifié en jeu après coup, avec la valeur relevée sur Traderie. */
export interface IdentifiedItem {
  id: string;
  /** Nom anglais de l'objet (sert à construire le lien Traderie). */
  name: string;
  /** Nom français saisi, quand il a été traduit. */
  nameFr?: string;
  /** false : nom absent des textes du jeu, le lien Traderie est incertain. */
  known?: boolean;
  /** Valeur notée par le joueur, texte libre (« 2 Ist », « 1 Ber »…). */
  value: string;
}

export interface SavedSession extends SessionSetup {
  /** Objets identifiés (absent pour les sessions antérieures à cette fonction). */
  items?: IdentifiedItem[];
  id: string;
  date: string;
  durationSeconds: number;
  runs: number;
  counts: Counts;
}

export function emptyCounts(): Counts {
  return Object.fromEntries(DROP_CATEGORIES.map((c) => [c.kind, 0])) as Counts;
}

export function summarizeEvents(events: SessionEvent[]): { runs: number; counts: Counts } {
  const counts = emptyCounts();
  let runs = 0;
  for (const e of events) {
    if (e.type === "run") runs++;
    else counts[e.type]++;
  }
  return { runs, counts };
}

export function runeTotal(counts: Counts): number {
  return RUNE_KINDS.reduce((sum, k) => sum + counts[k], 0);
}

/** Total des charmes magiques (0 pour les sessions enregistrées avant leur ajout). */
export function charmTotal(counts: Partial<Counts>): number {
  return CHARM_KINDS.reduce((sum, k) => sum + (counts[k] ?? 0), 0);
}

/** Taux horaire ; 0 si la durée est nulle. */
export function perHour(count: number, seconds: number): number {
  return seconds > 0 ? (count / seconds) * 3600 : 0;
}

export type Reliability = "low" | "medium" | "good";

/**
 * Les drops suivent une loi de Poisson : l'incertitude relative vaut ~1/√n.
 * On juge la fiabilité sur le nombre d'uniques + sets observés.
 */
export function reliability(counts: Counts): Reliability {
  const n = counts.unique + counts.set;
  if (n >= 30) return "good";
  if (n >= 10) return "medium";
  return "low";
}

/** Marge d'erreur (intervalle à 95 %) d'un taux horaire, dans la même unité. */
export function perHourMargin(count: number, seconds: number): number {
  return perHour(1.96 * Math.sqrt(Math.max(count, 1)), seconds);
}

export interface RouteAggregate {
  key: string;
  characterId: string;
  routeId: string;
  sessions: number;
  runs: number;
  durationSeconds: number;
  counts: Counts;
  /**
   * Temps de jeu pendant lequel chaque catégorie était comptée : une session
   * enregistrée avant l'ajout d'une catégorie (ex. charmes) ne la mesurait pas.
   */
  trackedSeconds: Record<DropKind, number>;
  mfMin: number;
  mfMax: number;
}

/** Regroupe les sessions par couple personnage + route. */
export function aggregateSessions(sessions: SavedSession[]): RouteAggregate[] {
  const groups = new Map<string, RouteAggregate>();
  for (const s of sessions) {
    const key = `${s.characterId}:${s.routeId}`;
    let g = groups.get(key);
    if (!g) {
      g = {
        key,
        characterId: s.characterId,
        routeId: s.routeId,
        sessions: 0,
        runs: 0,
        durationSeconds: 0,
        counts: emptyCounts(),
        trackedSeconds: emptyCounts(),
        mfMin: s.magicFind,
        mfMax: s.magicFind,
      };
      groups.set(key, g);
    }
    g.sessions++;
    g.runs += s.runs;
    g.durationSeconds += s.durationSeconds;
    for (const c of DROP_CATEGORIES) {
      if (s.counts[c.kind] === undefined) continue;
      g.counts[c.kind] += s.counts[c.kind];
      g.trackedSeconds[c.kind] += s.durationSeconds;
    }
    g.mfMin = Math.min(g.mfMin, s.magicFind);
    g.mfMax = Math.max(g.mfMax, s.magicFind);
  }
  return [...groups.values()];
}

/** Critère de comparaison : une catégorie, toutes les runes, ou uniques + sets. */
export type Metric = DropKind | "runes" | "charms" | "uniques_sets";

/** Temps pendant lequel le critère était mesuré (une catégorie représentative du groupe). */
export function metricSeconds(g: Pick<RouteAggregate, "trackedSeconds">, metric: Metric): number {
  const kind: DropKind =
    metric === "runes" ? "rune_low" : metric === "charms" ? "charm_small" : metric === "uniques_sets" ? "unique" : metric;
  return g.trackedSeconds[kind];
}

/** Taux horaire d'un critère, calculé sur le seul temps où il était mesuré. */
export function metricRate(g: Pick<RouteAggregate, "counts" | "trackedSeconds">, metric: Metric): number {
  return perHour(metricCount(g.counts, metric), metricSeconds(g, metric));
}

export function metricCount(counts: Counts, metric: Metric): number {
  if (metric === "runes") return runeTotal(counts);
  if (metric === "charms") return charmTotal(counts);
  if (metric === "uniques_sets") return counts.unique + counts.set;
  return counts[metric];
}

export interface RateComparison {
  rateA: number;
  rateB: number;
  /** Écart relatif de A par rapport à B (0,5 = +50 %). */
  relative: number;
  /** Écart significatif à 95 % (test z sur deux taux de Poisson). */
  significant: boolean;
}

/** Compare deux taux horaires observés : nA drops en tA secondes contre nB en tB. */
export function compareRates(nA: number, tA: number, nB: number, tB: number): RateComparison {
  const rateA = perHour(nA, tA);
  const rateB = perHour(nB, tB);
  const hA = tA / 3600;
  const hB = tB / 3600;
  // Variance d'un taux de Poisson = n / t² (au moins 1 drop pour éviter une variance nulle).
  const se = hA > 0 && hB > 0 ? Math.sqrt(Math.max(nA, 1) / hA ** 2 + Math.max(nB, 1) / hB ** 2) : Infinity;
  const z = (rateA - rateB) / se;
  return {
    rateA,
    rateB,
    relative: rateB > 0 ? rateA / rateB - 1 : rateA > 0 ? Infinity : 0,
    significant: Math.abs(z) >= 1.96,
  };
}

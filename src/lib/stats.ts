import { DROP_CATEGORIES, RUNE_KINDS, type DropKind } from "../data/drops";

export type Counts = Record<DropKind, number>;

export type EventType = "run" | DropKind;

export interface SessionEvent {
  type: EventType;
  /** Horodatage (ms). */
  at: number;
}

export interface SessionSetup {
  buildId: string;
  routeId: string;
  magicFind: number;
  players: number;
}

export interface SavedSession extends SessionSetup {
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
  buildId: string;
  routeId: string;
  sessions: number;
  runs: number;
  durationSeconds: number;
  counts: Counts;
  mfMin: number;
  mfMax: number;
}

/** Regroupe les sessions par couple build + route. */
export function aggregateSessions(sessions: SavedSession[]): RouteAggregate[] {
  const groups = new Map<string, RouteAggregate>();
  for (const s of sessions) {
    const key = `${s.buildId}:${s.routeId}`;
    let g = groups.get(key);
    if (!g) {
      g = {
        key,
        buildId: s.buildId,
        routeId: s.routeId,
        sessions: 0,
        runs: 0,
        durationSeconds: 0,
        counts: emptyCounts(),
        mfMin: s.magicFind,
        mfMax: s.magicFind,
      };
      groups.set(key, g);
    }
    g.sessions++;
    g.runs += s.runs;
    g.durationSeconds += s.durationSeconds;
    for (const c of DROP_CATEGORIES) g.counts[c.kind] += s.counts[c.kind] ?? 0;
    g.mfMin = Math.min(g.mfMin, s.magicFind);
    g.mfMax = Math.max(g.mfMax, s.magicFind);
  }
  return [...groups.values()];
}

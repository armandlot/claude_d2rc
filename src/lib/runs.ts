import type { SessionEvent } from "./stats";

/** Deux « fin de run » à moins de 5 s d'écart : double clic, le second est ignoré. */
export const DOUBLE_RUN_MS = 5000;

/** Au-delà de 10 s de run en cours, « Terminer » demande s'il faut compter ce run. */
export const COUNT_PROMPT_MS = 10000;

export interface SessionClock {
  startedAt: number;
  pausedAt: number | null;
  pausedTotalMs: number;
}

/** Temps de jeu écoulé depuis le début de la session, pauses exclues. */
export function activeMs(clock: SessionClock, now: number): number {
  return Math.max(0, (clock.pausedAt ?? now) - clock.startedAt - clock.pausedTotalMs);
}

/** Temps de jeu au moment d'un événement (estimé pour les anciens événements sans `elapsedMs`). */
function eventElapsedMs(e: SessionEvent, clock: SessionClock): number {
  return e.elapsedMs ?? Math.max(0, e.at - clock.startedAt - clock.pausedTotalMs);
}

/** Temps de jeu à la fin de chaque run terminé. */
export function runEndsMs(events: SessionEvent[], clock: SessionClock): number[] {
  return events.filter((e) => e.type === "run").map((e) => eventElapsedMs(e, clock));
}

/** Durée de chaque run terminé, dans l'ordre. */
export function runDurationsMs(events: SessionEvent[], clock: SessionClock): number[] {
  const ends = runEndsMs(events, clock);
  return ends.map((end, i) => Math.max(0, end - (i ? ends[i - 1] : 0)));
}

/** Temps de jeu à la fin du dernier run (0 si aucun). */
export function lastRunEndMs(events: SessionEvent[], clock: SessionClock): number {
  const ends = runEndsMs(events, clock);
  return ends.length ? ends[ends.length - 1] : 0;
}

/** Durée du run en cours (depuis le dernier « fin de run » ou le début). */
export function currentRunMs(events: SessionEvent[], clock: SessionClock, now: number): number {
  return Math.max(0, activeMs(clock, now) - lastRunEndMs(events, clock));
}

/** Le dernier « fin de run » date de moins de DOUBLE_RUN_MS : un nouveau serait un double clic. */
export function isDoubleRun(events: SessionEvent[], now: number): boolean {
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].type === "run") return now - events[i].at < DOUBLE_RUN_MS;
  }
  return false;
}

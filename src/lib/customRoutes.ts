import { ROUTES, type Route } from "../data/routes";
import { STOPS_BY_ID } from "../data/stops";

export interface CustomRoute {
  id: string;
  /** Nom choisi (facultatif) ; sinon la suite des étapes. */
  name: string;
  stops: string[];
}

export function newCustomRouteId(): string {
  return `custom_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** « Pindleskin → Mephisto → Summoner → Andariel ». */
export function stopsLabel(stops: string[]): string {
  return stops.map((id) => STOPS_BY_ID[id]?.name ?? id).join(" → ");
}

export function customRouteName(r: CustomRoute): string {
  return r.name.trim() || stopsLabel(r.stops) || "Route sans étape";
}

export function toRoute(r: CustomRoute): Route {
  return { id: r.id, name: customRouteName(r), phrase: `la route « ${customRouteName(r)} »`, plural: false, stops: r.stops };
}

/** Routes classiques + routes custom, indexées par identifiant. */
export function routeIndex(custom: CustomRoute[]): Record<string, Route> {
  return Object.fromEntries([...ROUTES, ...custom.map(toRoute)].map((r) => [r.id, r]));
}

/** Déplace l'étape d'indice `from` d'un cran (−1 vers le haut, +1 vers le bas). */
export function moveStop(stops: string[], from: number, delta: -1 | 1): string[] {
  const to = from + delta;
  if (to < 0 || to >= stops.length) return stops;
  const next = [...stops];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

export interface Route {
  id: string;
  name: string;
  /** Tournure pour les phrases de verdict : « les runs Chaos », « le clear du Pit »… */
  phrase: string;
  plural: boolean;
  /** Étapes d'une route custom, dans l'ordre (absent pour une route classique). */
  stops?: string[];
}

export const ROUTES: Route[] = [
  { id: "andariel", name: "Andariel", phrase: "les runs Andariel", plural: true },
  { id: "countess", name: "La Comtesse", phrase: "les runs Comtesse", plural: true },
  { id: "pit", name: "The Pit", phrase: "le clear du Pit", plural: false },
  { id: "cows", name: "Cow Level", phrase: "le Cow Level", plural: false },
  { id: "ancient_tunnels", name: "Ancient Tunnels", phrase: "le clear des Ancient Tunnels", plural: false },
  { id: "mephisto", name: "Mephisto", phrase: "les runs Mephisto", plural: true },
  { id: "travincal", name: "Travincal (Conseil)", phrase: "les runs Travincal", plural: true },
  { id: "chaos", name: "Chaos Sanctuary", phrase: "les runs Chaos", plural: true },
  { id: "pindleskin", name: "Pindleskin", phrase: "les runs Pindleskin", plural: true },
  { id: "eldritch_shenk", name: "Eldritch + Shenk", phrase: "les runs Eldritch + Shenk", plural: true },
  { id: "baal", name: "Baal (vagues + Baal)", phrase: "les runs Baal", plural: true },
  { id: "terror_zone", name: "Terror Zone", phrase: "le clear des Terror Zones", plural: false },
];

export const ROUTES_BY_ID: Record<string, Route> = Object.fromEntries(ROUTES.map((r) => [r.id, r]));

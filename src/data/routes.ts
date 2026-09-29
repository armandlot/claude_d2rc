export interface Route {
  id: string;
  name: string;
  act: 1 | 2 | 3 | 4 | 5;
  /** Tournure pour les phrases de verdict : « les runs Chaos », « le clear du Pit »… */
  phrase: string;
  plural: boolean;
}

export const ROUTES: Route[] = [
  { id: "andariel", name: "Andariel", act: 1, phrase: "les runs Andariel", plural: true },
  { id: "countess", name: "La Comtesse", act: 1, phrase: "les runs Comtesse", plural: true },
  { id: "pit", name: "The Pit", act: 1, phrase: "le clear du Pit", plural: false },
  { id: "cows", name: "Cow Level", act: 1, phrase: "le Cow Level", plural: false },
  { id: "ancient_tunnels", name: "Ancient Tunnels", act: 2, phrase: "le clear des Ancient Tunnels", plural: false },
  { id: "mephisto", name: "Mephisto", act: 3, phrase: "les runs Mephisto", plural: true },
  { id: "travincal", name: "Travincal (Conseil)", act: 3, phrase: "les runs Travincal", plural: true },
  { id: "chaos", name: "Chaos Sanctuary", act: 4, phrase: "les runs Chaos", plural: true },
  { id: "pindleskin", name: "Pindleskin", act: 5, phrase: "les runs Pindleskin", plural: true },
  { id: "eldritch_shenk", name: "Eldritch + Shenk", act: 5, phrase: "les runs Eldritch + Shenk", plural: true },
  { id: "baal", name: "Baal (vagues + Baal)", act: 5, phrase: "les runs Baal", plural: true },
  { id: "terror_zone", name: "Terror Zone", act: 1, phrase: "le clear des Terror Zones", plural: false },
];

export const ROUTES_BY_ID: Record<string, Route> = Object.fromEntries(ROUTES.map((r) => [r.id, r]));

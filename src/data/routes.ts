export interface Route {
  id: string;
  name: string;
  act: 1 | 2 | 3 | 4 | 5;
}

export const ROUTES: Route[] = [
  { id: "andariel", name: "Andariel", act: 1 },
  { id: "countess", name: "La Comtesse", act: 1 },
  { id: "pit", name: "The Pit", act: 1 },
  { id: "cows", name: "Cow Level", act: 1 },
  { id: "ancient_tunnels", name: "Ancient Tunnels", act: 2 },
  { id: "mephisto", name: "Mephisto", act: 3 },
  { id: "travincal", name: "Travincal (Conseil)", act: 3 },
  { id: "chaos", name: "Chaos Sanctuary", act: 4 },
  { id: "pindleskin", name: "Pindleskin", act: 5 },
  { id: "eldritch_shenk", name: "Eldritch + Shenk", act: 5 },
  { id: "baal", name: "Baal (vagues + Baal)", act: 5 },
  { id: "terror_zone", name: "Terror Zone", act: 1 },
];

export const ROUTES_BY_ID: Record<string, Route> = Object.fromEntries(ROUTES.map((r) => [r.id, r]));

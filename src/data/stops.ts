/** Étapes (boss ou zones) qui composent une route custom, par acte. */
export interface Stop {
  id: string;
  name: string;
  act: 1 | 2 | 3 | 4 | 5;
}

export const STOPS: Stop[] = [
  { id: "andariel", name: "Andariel", act: 1 },
  { id: "countess", name: "La Comtesse", act: 1 },
  { id: "pit", name: "The Pit", act: 1 },
  { id: "cows", name: "Cow Level", act: 1 },
  { id: "summoner", name: "Summoner", act: 2 },
  { id: "ancient_tunnels", name: "Ancient Tunnels", act: 2 },
  { id: "duriel", name: "Duriel", act: 2 },
  { id: "mephisto", name: "Mephisto", act: 3 },
  { id: "travincal", name: "Travincal", act: 3 },
  { id: "lower_kurast", name: "Lower Kurast (coffres)", act: 3 },
  { id: "chaos", name: "Chaos Sanctuary", act: 4 },
  { id: "diablo", name: "Diablo (sans sceaux)", act: 4 },
  { id: "pindleskin", name: "Pindleskin", act: 5 },
  { id: "eldritch", name: "Eldritch", act: 5 },
  { id: "shenk", name: "Shenk", act: 5 },
  { id: "thresh_socket", name: "Thresh Socket", act: 5 },
  { id: "nihlathak", name: "Nihlathak", act: 5 },
  { id: "worldstone", name: "Worldstone Keep", act: 5 },
  { id: "baal", name: "Baal", act: 5 },
  { id: "terror_zone", name: "Terror Zone", act: 1 },
];

export const STOPS_BY_ID: Record<string, Stop> = Object.fromEntries(STOPS.map((s) => [s.id, s]));

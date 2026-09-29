export interface Build {
  id: string;
  name: string;
  className: string;
}

export const BUILDS: Build[] = [
  { id: "blizzard_sorc", name: "Blizzard Sorceress", className: "Sorcière" },
  { id: "light_sorc", name: "Lightning Sorceress", className: "Sorcière" },
  { id: "meteorb", name: "Meteorb Sorceress", className: "Sorcière" },
  { id: "hammerdin", name: "Hammerdin", className: "Paladin" },
  { id: "smiter", name: "Smiter", className: "Paladin" },
  { id: "javazon", name: "Javazon", className: "Amazone" },
  { id: "summon_necro", name: "Summon Necromancer", className: "Nécromancien" },
  { id: "wind_druid", name: "Wind Druid", className: "Druide" },
  { id: "trapsin", name: "Trapsin", className: "Assassin" },
  { id: "ww_barb", name: "Whirlwind Barbarian", className: "Barbare" },
  { id: "other", name: "Autre build", className: "—" },
];

export const BUILDS_BY_ID: Record<string, Build> = Object.fromEntries(BUILDS.map((b) => [b.id, b]));

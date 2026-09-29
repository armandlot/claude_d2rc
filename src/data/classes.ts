export type ClassId = "amazon" | "assassin" | "barbarian" | "druid" | "necromancer" | "paladin" | "sorceress";

export interface CharacterClass {
  id: ClassId;
  name: string;
  /** Genre grammatical, pour « ton Paladin » / « ta Sorcière ». */
  feminine: boolean;
  /** Spécialisations courantes (texte libre possible en plus). */
  specs: string[];
}

export const CLASSES: CharacterClass[] = [
  { id: "amazon", name: "Amazone", feminine: true, specs: ["Javazon", "Bowazon", "Fury Zon"] },
  { id: "assassin", name: "Assassin", feminine: true, specs: ["Trapsin", "Mosaïque", "Lames"] },
  { id: "barbarian", name: "Barbare", feminine: false, specs: ["Tourbillon", "Frénésie", "Find Item", "Cris"] },
  { id: "druid", name: "Druide", feminine: false, specs: ["Vent", "Feu", "Fury"] },
  { id: "necromancer", name: "Nécromancien", feminine: false, specs: ["Invocation", "Poison", "Os"] },
  { id: "paladin", name: "Paladin", feminine: false, specs: ["Marteau", "Smiter", "FoH", "Zealot"] },
  { id: "sorceress", name: "Sorcière", feminine: true, specs: ["Blizzard", "Foudre", "Météorb", "Orbe gelé", "Nova"] },
];

export const CLASSES_BY_ID = Object.fromEntries(CLASSES.map((c) => [c.id, c])) as Record<ClassId, CharacterClass>;

export type DamageType = "physical" | "cold" | "fire" | "lightning" | "poison" | "magic";

/** Qualité d'un objet : détermine l'effet de la Magic Find (MF) sur ses chances. */
export type Quality = "unique" | "set" | "rare" | "magic" | "rune" | "other";

export interface Item {
  id: string;
  name: string;
  quality: Quality;
  /** Valeur par défaut, exprimée en runes Ist (unité d'échange de l'app). */
  defaultValue: number;
}

export interface Build {
  id: string;
  name: string;
  className: string;
  /** Types de dégâts, le principal en premier. */
  damageTypes: DamageType[];
  /** Vitesse de nettoyage relative (1 = build de référence). */
  speed: number;
  /** Téléportation native (Sorcière). Les autres peuvent utiliser Enigma. */
  hasTeleport: boolean;
  /** Bonus/malus de vitesse spécifique à certaines routes. */
  routeAffinity?: Record<string, number>;
  description: string;
}

export interface RouteDrop {
  itemId: string;
  /** Nombre moyen d'exemplaires par run (≈ probabilité), à 300 MF, joueurs 1. */
  perRun: number;
}

export interface Route {
  id: string;
  name: string;
  act: 1 | 2 | 3 | 4 | 5;
  areaLevel: number;
  kind: "boss" | "area";
  /** Durée d'un run (sans création de partie) pour un build de référence bien équipé. */
  baseRunSeconds: number;
  /** Part du temps allongée sans téléportation (0 = aucun impact, 1 = temps doublé). */
  teleportDependence: number;
  /** Proportion de monstres immunisés à chaque type de dégâts (0..1). */
  immunities: Partial<Record<DamageType, number>>;
  drops: RouteDrop[];
  notes: string;
}

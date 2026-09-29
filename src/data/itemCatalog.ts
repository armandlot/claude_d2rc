/**
 * Noms anglais proposés à la saisie d'un objet identifié. Ce sont les noms
 * utilisés par Traderie : le lien de prix est construit à partir d'eux.
 * La saisie reste libre pour tout objet absent de la liste.
 */
const RUNES = [
  "El", "Eld", "Tir", "Nef", "Eth", "Ith", "Tal", "Ral", "Ort", "Thul", "Amn",
  "Sol", "Shael", "Dol", "Hel", "Io", "Lum", "Ko", "Fal", "Lem", "Pul", "Um",
  "Mal", "Ist", "Gul", "Vex", "Ohm", "Lo", "Sur", "Ber", "Jah", "Cham", "Zod",
].map((r) => `${r} Rune`);

const CHARMS_AND_JEWELS = [
  "Small Charm", "Large Charm", "Grand Charm",
  "Gheed's Fortune", "Annihilus", "Hellfire Torch",
  "Jewel", "Rainbow Facet",
];

const UNIQUES = [
  "Harlequin Crest", "Arachnid Mesh", "War Traveler", "Stone of Jordan", "Griffon's Eye",
  "Death's Fathom", "Crown of Ages", "Tyrael's Might", "Andariel's Visage", "Mara's Kaleidoscope",
  "Highlord's Wrath", "Herald of Zakarum", "Titan's Revenge", "Nightwing's Veil", "Skin of the Vipermagi",
  "Magefist", "Chance Guards", "Goldwrap", "Nagelring", "Manald Heal", "Raven Frost", "Dwarf Star",
  "Bul-Kathos' Wedding Band", "Wizardspike", "The Oculus", "Vampire Gaze", "Verdungo's Hearty Cord",
  "Thundergod's Vigor", "Arreat's Face", "Jalal's Mane", "Homunculus", "Stormshield", "Gore Rider",
  "Sandstorm Trek", "Waterwalk", "Frostburn", "Lidless Wall", "Eschuta's Temper", "Death's Web",
  "Windforce", "Grandfather", "Doombringer", "Azurewrath", "Metalgrid", "Atma's Scarab", "Saracen's Chance",
  "Kira's Guardian", "Veil of Steel", "Shaftstop", "Tal Rasha's Lidless Eye", "Deathbit", "Lycander's Aim",
  "Titan's Grip", "Steelrend", "Marrowwalk", "Shadow Dancer", "Wisp Projector", "Ormus' Robes",
  "Leviathan", "Templar's Might", "Tyrael's Might", "Seraph's Hymn", "Crescent Moon",
];

const SETS = [
  "Tal Rasha's Guardianship", "Tal Rasha's Horadric Crest", "Tal Rasha's Fine-Spun Cloth",
  "Tal Rasha's Adjudication", "Immortal King's Stone Crusher", "Immortal King's Soul Cage",
  "Immortal King's Will", "Immortal King's Forge", "Immortal King's Detail", "Immortal King's Pillar",
  "Trang-Oul's Avatar", "Trang-Oul's Guise", "Trang-Oul's Scales", "Guillaume's Face", "Laying of Hands",
  "Natalya's Totem", "Natalya's Shadow", "Aldur's Advance", "Griswold's Honor", "Sigon's Complete Steel",
  "Mavina's Embrace", "Credendum", "Dangoon's Teaching",
];

const BASES = ["Monarch", "Archon Plate", "Mage Plate", "Dusk Shroud", "Thresher", "Giant Thresher", "Colossus Voulge", "Berserker Axe", "Phase Blade"];

export const ITEM_NAMES: string[] = [...new Set([...UNIQUES, ...SETS, ...CHARMS_AND_JEWELS, ...RUNES, ...BASES])].sort((a, b) =>
  a.localeCompare(b),
);

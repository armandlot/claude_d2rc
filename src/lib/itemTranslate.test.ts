import { describe, expect, it } from "vitest";
import { isPartialName, resolveItemName } from "./itemTranslate";

describe("resolveItemName", () => {
  it("traduit les noms français du jeu", () => {
    expect(resolveItemName("Cimier Arlequin")).toEqual({ english: "Harlequin Crest", french: "Cimier Arlequin", known: true });
    expect(resolveItemName("Fortune de Gheed").english).toBe("Gheed's Fortune");
    expect(resolveItemName("Garde de Tal Rasha").english).toBe("Tal Rasha's Guardianship");
    expect(resolveItemName("Torche des flammes infernales").english).toBe("Hellfire Torch");
  });

  it("ignore accents, casse, ligatures et apostrophes typographiques", () => {
    expect(resolveItemName("oeil du griffon").english).toBe("Griffon's Eye");
    // Le nom affiché reprend l'orthographe officielle du jeu.
    expect(resolveItemName("cimier arlequin").french).toBe("Cimier Arlequin");
    expect(resolveItemName("ŒIL DU GRIFFON").english).toBe("Griffon's Eye");
    expect(resolveItemName("  torche d’iro ").english).toBe("Torch of Iro");
  });

  it("ne confond pas les charmes (piège de traduction)", () => {
    expect(resolveItemName("Charme mineur").english).toBe("Small Charm");
    expect(resolveItemName("Grand charme").english).toBe("Large Charm");
    expect(resolveItemName("Charme majeur").english).toBe("Grand Charm");
  });

  it("reconnaît les runes, noms courts compris", () => {
    expect(resolveItemName("Rune Ber").english).toBe("Ber Rune");
    expect(resolveItemName("ber").english).toBe("Ber Rune");
    expect(resolveItemName("Jah Rune")).toEqual({ english: "Jah Rune", known: true });
  });

  it("accepte directement un nom anglais", () => {
    expect(resolveItemName("harlequin crest")).toEqual({ english: "Harlequin Crest", known: true });
    expect(resolveItemName("Shako")).toEqual({ english: "Shako", known: true });
  });

  it("garde tel quel un nom inconnu, signalé comme non reconnu", () => {
    expect(resolveItemName("Objet mystère")).toEqual({ english: "Objet mystère", known: false });
  });
});

describe("isPartialName", () => {
  it("distingue une saisie en cours d'un nom inconnu", () => {
    expect(isPartialName("Cimier Arl")).toBe(true);
    expect(isPartialName("oeil du g")).toBe(true);
    expect(isPartialName("Objet mystère")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { activeSeasonalTheme } from "./seasonal";

// Dates construites en heure locale, comme sur l'appareil du joueur.
const at = (y: number, m: number, d: number, h = 0, min = 0, s = 0) => new Date(y, m - 1, d, h, min, s);

describe("activeSeasonalTheme", () => {
  it("active le thème Halloween pendant la période", () => {
    expect(activeSeasonalTheme(at(2026, 10, 23))?.id).toBe("halloween");
    expect(activeSeasonalTheme(at(2026, 10, 31, 21, 0))?.id).toBe("halloween");
    expect(activeSeasonalTheme(at(2026, 11, 1, 23, 59, 59))?.id).toBe("halloween");
  });

  it("s'arrête le 2 novembre à 00:00 pile", () => {
    expect(activeSeasonalTheme(at(2026, 11, 2, 0, 0, 0))).toBeNull();
    expect(activeSeasonalTheme(at(2026, 12, 25))).toBeNull();
  });

  it("n'est pas actif avant la date de début", () => {
    expect(activeSeasonalTheme(at(2026, 10, 22, 23, 59))).toBeNull();
  });
});

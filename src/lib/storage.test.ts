import { describe, expect, it } from "vitest";
import { migrateLegacyStorage } from "./storage";

function memoryStorage(init: Record<string, string>): Storage {
  const data = new Map(Object.entries(init));
  return {
    get length() {
      return data.size;
    },
    key: (i) => [...data.keys()][i] ?? null,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
    clear: () => data.clear(),
  };
}

describe("migrateLegacyStorage", () => {
  it("reprend les données enregistrées sous l'ancien nom", () => {
    const s = memoryStorage({ "d2r-run-profit:v2:sessions": "[1]", "d2r-run-profit:v3:characters": "[2]", autre: "x" });
    expect(migrateLegacyStorage(s)).toBe(2);
    expect(s.getItem("d2r-run-counter:v2:sessions")).toBe("[1]");
    expect(s.getItem("d2r-run-profit:v2:sessions")).toBeNull();
    expect(s.getItem("autre")).toBe("x");
  });

  it("reprend toutes les clés, même nombreuses (positions décalées pendant la copie)", () => {
    const init = Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`d2r-run-profit:k${i}`, String(i)]));
    const s = memoryStorage(init);
    expect(migrateLegacyStorage(s)).toBe(8);
    for (let i = 0; i < 8; i++) expect(s.getItem(`d2r-run-counter:k${i}`)).toBe(String(i));
    expect(s.length).toBe(8);
  });

    it("n'écrase pas des données déjà présentes sous le nouveau nom", () => {
    const s = memoryStorage({ "d2r-run-profit:v2:sessions": "[ancien]", "d2r-run-counter:v2:sessions": "[nouveau]" });
    expect(migrateLegacyStorage(s)).toBe(0);
    expect(s.getItem("d2r-run-counter:v2:sessions")).toBe("[nouveau]");
  });
});

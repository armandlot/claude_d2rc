import { describe, expect, it } from "vitest";
import { traderieSlug, traderieUrl } from "./traderie";

describe("traderieSlug", () => {
  it("transforme le nom anglais de l'objet", () => {
    expect(traderieSlug("Large Charm")).toBe("large-charm");
    expect(traderieSlug("Harlequin Crest")).toBe("harlequin-crest");
    expect(traderieSlug("Griffon's Eye")).toBe("griffons-eye");
    expect(traderieSlug("  Tal Rasha's Fine-Spun Cloth ")).toBe("tal-rashas-fine-spun-cloth");
    expect(traderieSlug("Bul-Kathos' Wedding Band")).toBe("bul-kathos-wedding-band");
  });
});

describe("traderieUrl", () => {
  it("reproduit exactement le lien de référence (Ladder Softcore)", () => {
    expect(traderieUrl("Large Charm", { ladder: true, hardcore: false })).toBe(
      "https://traderie.com/diablo2resurrected/product/large-charm/recent?prop_Mode=softcore&prop_Ladder=true&prop_Game%20version=reign%20of%20the%20warlock",
    );
  });

  it("reprend le mode et le royaume du personnage", () => {
    const url = traderieUrl("Ber Rune", { ladder: false, hardcore: true });
    expect(url).toContain("/product/ber-rune/recent?");
    expect(url).toContain("prop_Mode=hardcore");
    expect(url).toContain("prop_Ladder=false");
  });
});

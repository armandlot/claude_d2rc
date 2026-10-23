import { describe, expect, it } from "vitest";
import { decideSync, isProfileKey, newProfileKey } from "./sync";

describe("decideSync", () => {
  const clean = { syncedAt: 100, dirty: false, changedAt: 50 };

  it("envoie les données locales vers un profil vide", () => {
    expect(decideSync({ syncedAt: null, dirty: false, changedAt: 0 }, null, true)).toBe("push");
    expect(decideSync({ syncedAt: null, dirty: false, changedAt: 0 }, null, false)).toBe("none");
  });

  it("ne fait rien si rien n'a changé", () => {
    expect(decideSync(clean, 100, true)).toBe("none");
  });

  it("envoie les modifications locales", () => {
    expect(decideSync({ ...clean, dirty: true, changedAt: 150 }, 100, true)).toBe("push");
  });

  it("récupère ce qui a été modifié sur un autre appareil", () => {
    expect(decideSync(clean, 200, true)).toBe("pull");
  });

  it("un appareil jamais synchronisé n'écrase jamais un profil existant", () => {
    expect(decideSync({ syncedAt: null, dirty: true, changedAt: 9_999 }, 200, false)).toBe("pull");
    expect(decideSync({ syncedAt: null, dirty: true, changedAt: 9_999 }, 200, true)).toBe("pull");
  });

  it("en cas de conflit, la modification la plus récente l'emporte", () => {
    expect(decideSync({ syncedAt: 100, dirty: true, changedAt: 300 }, 200, true)).toBe("push");
    expect(decideSync({ syncedAt: 100, dirty: true, changedAt: 150 }, 200, true)).toBe("pull");
  });
});

describe("newProfileKey", () => {
  it("génère des clés valides et différentes", () => {
    const a = newProfileKey();
    expect(isProfileKey(a)).toBe(true);
    expect(a).toHaveLength(32);
    expect(newProfileKey()).not.toBe(a);
  });
});

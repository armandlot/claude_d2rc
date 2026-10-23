import { describe, expect, it } from "vitest";
import { base64url, checkClaims, decodeIdToken, hmacHex, parseCookies, pkceChallenge, randomToken } from "./oidc";

const jwt = (claims: object) => `${base64url(new TextEncoder().encode('{"alg":"RS256"}'))}.${base64url(new TextEncoder().encode(JSON.stringify(claims)))}.sig`;

describe("connexion Google (OIDC)", () => {
  it("calcule le code_challenge PKCE S256 (vecteur de la RFC 7636)", async () => {
    expect(await pkceChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });

  it("génère des jetons aléatoires URL-safe de 256 bits", () => {
    const a = randomToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(randomToken()).not.toBe(a);
  });

  it("hache l'identifiant Google avec une clé secrète (HMAC-SHA256, RFC 4231 cas 2)", async () => {
    expect(await hmacHex("Jefe", "what do ya want for nothing?")).toBe(
      "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843",
    );
  });

  it("lit les cookies", () => {
    const c = parseCookies("a=1; __Host-d2r_session=abc-_; b=x=y");
    expect(c.get("__Host-d2r_session")).toBe("abc-_");
    expect(c.get("b")).toBe("x=y");
    expect(parseCookies(null).size).toBe(0);
  });

  describe("vérification de l'ID token", () => {
    const now = Date.UTC(2026, 9, 23);
    const expected = { clientId: "client.apps.googleusercontent.com", nonce: "n0nce", now };
    const good = { iss: "https://accounts.google.com", aud: expected.clientId, sub: "1234567890", exp: now / 1000 + 300, nonce: "n0nce" };

    it("accepte un jeton valide et renvoie le sub", () => {
      expect(checkClaims(decodeIdToken(jwt(good)), expected)).toEqual({ ok: true, sub: "1234567890" });
      expect(checkClaims({ ...good, iss: "accounts.google.com" }, expected).ok).toBe(true);
    });

    it.each([
      ["émetteur", { iss: "https://evil.example" }],
      ["destinataire", { aud: "autre-client" }],
      ["expiration", { exp: now / 1000 - 1 }],
      ["nonce", { nonce: "rejoue" }],
      ["sub", { sub: "" }],
    ])("refuse un mauvais %s", (_, patch) => {
      expect(checkClaims({ ...good, ...patch }, expected).ok).toBe(false);
    });

    it("refuse un jeton illisible", () => {
      expect(decodeIdToken("pas.un-jwt")).toBeNull();
      expect(decodeIdToken("a.!!!.c")).toBeNull();
      expect(checkClaims(null, expected).ok).toBe(false);
    });
  });
});

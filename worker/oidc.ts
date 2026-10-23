/**
 * Briques de la connexion Google (OpenID Connect, code d'autorisation + PKCE).
 * Module pur (Web Crypto uniquement) : testé avec Vitest.
 */

export const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

const encoder = new TextEncoder();

export function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64url(text: string): string {
  const b64 = text.replace(/-/g, "+").replace(/_/g, "/");
  return atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
}

/** Jeton aléatoire URL-safe (32 octets par défaut, 256 bits). */
export function randomToken(bytes = 32): string {
  return base64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

export async function sha256Hex(text: string): Promise<string> {
  return hex(await crypto.subtle.digest("SHA-256", encoder.encode(text)));
}

/** HMAC-SHA256 : empreinte non réversible, même si la base fuit (la clé reste dans les secrets). */
export async function hmacHex(secret: string, text: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, encoder.encode(text)));
}

/** PKCE : code_challenge = BASE64URL(SHA-256(code_verifier)). */
export async function pkceChallenge(verifier: string): Promise<string> {
  return base64url(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(verifier))));
}

/** Lit l'en-tête Cookie. */
export function parseCookies(header: string | null): Map<string, string> {
  const out = new Map<string, string>();
  for (const part of (header ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0) out.set(part.slice(0, i).trim(), part.slice(i + 1).trim());
  }
  return out;
}

export interface IdTokenClaims {
  iss?: unknown;
  aud?: unknown;
  sub?: unknown;
  exp?: unknown;
  nonce?: unknown;
}

/** Contenu (payload) d'un ID token JWT. */
export function decodeIdToken(token: string): IdTokenClaims | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const claims = JSON.parse(fromBase64url(parts[1]));
    return claims && typeof claims === "object" ? claims : null;
  } catch {
    return null;
  }
}

/**
 * Vérifie un ID token reçu directement de Google (endpoint token, en HTTPS) :
 * dans ce cas la signature n'a pas à être revérifiée (OpenID Connect Core 3.1.3.7),
 * mais émetteur, destinataire, expiration et nonce doivent l'être.
 * Renvoie l'identifiant Google (`sub`) ou une erreur.
 */
export function checkClaims(
  claims: IdTokenClaims | null,
  expected: { clientId: string; nonce: string; now: number },
): { ok: true; sub: string } | { ok: false; error: string } {
  if (!claims) return { ok: false, error: "ID token illisible" };
  if (typeof claims.iss !== "string" || !GOOGLE_ISSUERS.includes(claims.iss)) return { ok: false, error: "émetteur inattendu" };
  if (claims.aud !== expected.clientId) return { ok: false, error: "destinataire inattendu" };
  if (typeof claims.exp !== "number" || claims.exp * 1000 < expected.now) return { ok: false, error: "jeton expiré" };
  if (claims.nonce !== expected.nonce) return { ok: false, error: "nonce invalide" };
  if (typeof claims.sub !== "string" || !claims.sub) return { ok: false, error: "identifiant manquant" };
  return { ok: true, sub: claims.sub };
}

# Standard « Connexion Google sans données personnelles »

Ce document contient **un bloc à copier-coller dans Claude Code** au lancement d'un nouveau
projet. Le bloc commence à « DÉBUT DU BLOC » et va jusqu'à « FIN DU BLOC ». Il reprend le
système éprouvé sur D2R Run Counter :

- connexion « Se connecter avec Google » sécurisée ;
- **aucune donnée personnelle** enregistrée (ni e-mail, ni nom, ni mot de passe) ;
- déconnexion et suppression du compte ;
- déploiement sur Cloudflare Workers + D1 (offre gratuite).

Le guide des actions à faire **vous-même** dans Google Cloud Console et Cloudflare est
inclus dans le bloc : Claude vous le déroulera étape par étape.

**Mode d'emploi :** ouvrez une session Claude Code sur le nouveau dépôt, collez le bloc,
puis ajoutez en dessous une ligne qui décrit l'application à créer.

---

````text
=== DÉBUT DU BLOC ===

# Exigence de base du projet : connexion Google sécurisée, sans données personnelles

Intègre dès le départ, dans l'application que je vais te décrire, le système de comptes
ci-dessous. C'est un standard que j'applique à tous mes projets : ne l'affaiblis pas, ne
le remplace pas par une autre méthode (e-mail, mot de passe, Firebase, Auth0…) sans me le
demander. Explique-moi tout en français, simplement, une étape à la fois.

## 1. Principes non négociables

1. **Strict minimum de données** : scope OAuth `openid` SEUL (jamais `email`, ni `profile`).
   Google ne transmet que l'identifiant opaque `sub`.
2. **Ne stocker que HMAC-SHA256(AUTH_PEPPER, sub)**, jamais `sub` en clair. Aucun jeton Google
   (access, refresh, id) n'est conservé.
3. **Aucun mot de passe**, aucun e-mail, aucun nom, aucune photo, aucun traceur.
4. **Secrets jamais dans le dépôt ni dans la conversation** : `GOOGLE_CLIENT_SECRET` et
   `AUTH_PEPPER` sont saisis par moi-même dans Cloudflare (et dans `.dev.vars`, ignoré par
   git, pour le local). Si je m'apprête à te coller un secret, arrête-moi. L'ID client
   Google, lui, est public : il va dans `wrangler.toml` (`[vars]`).
5. **Flux OpenID Connect « code d'autorisation » + PKCE S256 + state + nonce**,
   `prompt=select_account`. State, code_verifier et nonce : cookie `__Host-oauth`
   HttpOnly, Secure, SameSite=Lax, 10 minutes.
6. **Vérification de l'ID token** (reçu directement de l'endpoint token de Google en HTTPS,
   donc signature non revérifiée, OpenID Connect Core 3.1.3.7) : `iss` ∈
   {https://accounts.google.com, accounts.google.com}, `aud` = ID client, `exp` non dépassé,
   `nonce` identique, `sub` non vide.
7. **Session** : jeton aléatoire 256 bits dans le cookie `__Host-session` (HttpOnly, Secure,
   SameSite=Lax, Path=/, 90 jours prolongés à l'usage au plus une fois par jour). La base ne
   garde que SHA-256 du jeton.
8. **CSRF** : toute requête qui modifie des données avec le cookie exige un en-tête `Origin`
   égal à l'origine de l'application (403 sinon).
9. **Droit à l'effacement** : bouton « Supprimer mon compte et mes données » qui efface le
   compte, toutes ses sessions et TOUTES ses données applicatives (vérifier en base qu'il ne
   reste rien).
10. **Page `/confidentialite`** (fichier `public/confidentialite.html`, lien `/confidentialite`
    sans « .html », Cloudflare redirige sinon) : ce qui est stocké, ce qui ne l'est jamais,
    comment tout supprimer, comment retirer l'accès depuis le compte Google.
11. **Tant que les secrets manquent**, le bouton de connexion est masqué et l'application
    fonctionne sans compte (pas d'erreur).

## 2. Architecture cible

- **Cloudflare Workers** (TypeScript) avec assets statiques : `[assets]` + `binding = "ASSETS"`,
  `not_found_handling = "single-page-application"`, `run_worker_first = ["/api/*"]`.
- **Cloudflare D1** (binding `DB`), migrations dans `migrations/`.
- Front au choix selon l'application (par défaut React + TypeScript + Vite, PWA si utile).
- Toutes les données applicatives portent une colonne `user_id` (ou équivalent) et chaque
  requête est filtrée par l'utilisateur de la session : un compte ne voit jamais les
  données d'un autre.
- Application Android/desktop : redirection dans la même fenêtre vers Google
  (`location.assign("/api/auth/google/start")`), retour sur `/?auth=ok|annule|erreur|indisponible`.

### Routes API

| Route | Rôle |
| --- | --- |
| `GET /api/auth/google/start` | 302 vers Google (state, PKCE, nonce) |
| `GET /api/auth/google/callback` | échange du code, compte, session, 302 vers `/?auth=…` |
| `GET /api/auth/me` | `{ enabled, user: { id } \| null }` |
| `POST /api/auth/logout` | corps `{ all?: boolean }` : cet appareil ou tous |
| `DELETE /api/account` | supprime compte + sessions + données |

### Migration `migrations/0001_auth.sql`

```sql
-- Comptes « Se connecter avec Google » : aucune donnée personnelle.
CREATE TABLE IF NOT EXISTS users (
  id              TEXT    PRIMARY KEY,      -- identifiant aléatoire
  google_sub_hash TEXT    NOT NULL UNIQUE,  -- HMAC-SHA256(AUTH_PEPPER, sub Google)
  created_at      INTEGER NOT NULL,
  last_login_at   INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS auth_sessions (
  id_hash    TEXT    PRIMARY KEY,           -- SHA-256 du jeton de session
  user_id    TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS auth_sessions_by_user ON auth_sessions (user_id);
```

### `wrangler.toml` (extrait)

```toml
name = "<nom-du-projet>"
main = "worker/index.ts"
compatibility_date = "<date du jour>"

[assets]
directory = "./dist"
binding = "ASSETS"
not_found_handling = "single-page-application"
run_worker_first = ["/api/*"]

[[d1_databases]]
binding = "DB"
database_name = "<nom-du-projet>"
database_id = "<fourni par moi après création de la base>"
migrations_dir = "migrations"

# Public. Les secrets GOOGLE_CLIENT_SECRET et AUTH_PEPPER sont dans Cloudflare / .dev.vars.
[vars]
GOOGLE_CLIENT_ID = "<fourni par moi>"
```

`.gitignore` doit contenir `.wrangler` et `.dev.vars`.

### Code de référence à reprendre tel quel

`worker/oidc.ts` (module pur, Web Crypto) :

```ts
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
```

`worker/auth.ts` :

```ts
/**
 * « Se connecter avec Google » sans données personnelles (OpenID Connect, scope `openid` seul).
 * - Google ne transmet que l'identifiant opaque du compte (`sub`), stocké haché :
 *   HMAC-SHA256 avec le secret AUTH_PEPPER. Ni e-mail, ni nom, ni jeton Google conservé.
 * - Session : jeton aléatoire dans un cookie __Host- HttpOnly ; la base n'en garde que l'empreinte.
 * - Aller-retour chez Google : state + PKCE (S256) + nonce, gardés 10 min dans un cookie HttpOnly.
 */
import {
  checkClaims,
  decodeIdToken,
  GOOGLE_AUTH_ENDPOINT,
  GOOGLE_TOKEN_ENDPOINT,
  hmacHex,
  parseCookies,
  pkceChallenge,
  randomToken,
  sha256Hex,
} from "./oidc";

export interface AuthEnv {
  DB: D1Database;
  GOOGLE_CLIENT_ID?: string;
  /** Secrets Cloudflare (jamais dans le dépôt). */
  GOOGLE_CLIENT_SECRET?: string;
  AUTH_PEPPER?: string;
  /** Uniquement pour les tests locaux (faux serveur Google). */
  GOOGLE_AUTH_ENDPOINT?: string;
  GOOGLE_TOKEN_ENDPOINT?: string;
}

export interface AuthHooks<E extends AuthEnv> {
  /** Efface toutes les données applicatives du compte (appelé par DELETE /api/account). */
  deleteUserData(env: E, userId: string): Promise<void>;
}

const SESSION_COOKIE = "__Host-session";
const FLOW_COOKIE = "__Host-oauth";
const DAY_MS = 86_400_000;
const SESSION_MS = 90 * DAY_MS;
const FLOW_SECONDS = 600;

const json = (data: unknown, status = 200, setCookie?: string) => {
  const headers = new Headers({ "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  if (setCookie) headers.append("set-cookie", setCookie);
  return new Response(JSON.stringify(data), { status, headers });
};
const error = (status: number, message: string) => json({ error: message }, status);

const cookie = (name: string, value: string, maxAge: number) =>
  `${name}=${value}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Lax`;
const clearCookie = (name: string) => cookie(name, "", 0);

function redirect(location: string, cookies: string[] = []): Response {
  const headers = new Headers({ location, "cache-control": "no-store" });
  for (const c of cookies) headers.append("set-cookie", c);
  return new Response(null, { status: 302, headers });
}

export function authEnabled(env: AuthEnv): boolean {
  return !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.AUTH_PEPPER);
}

/** CSRF : en plus de SameSite=Lax, toute requête qui modifie des données doit venir de l'application. */
export function sameOrigin(request: Request): boolean {
  return request.headers.get("origin") === new URL(request.url).origin;
}

export interface CurrentUser {
  userId: string;
  sessionHash: string;
  expiresAt: number;
}

/** Utilisateur connecté (cookie de session valide), sinon null. */
export async function currentUser(request: Request, env: AuthEnv): Promise<CurrentUser | null> {
  if (!authEnabled(env)) return null;
  const token = parseCookies(request.headers.get("cookie")).get(SESSION_COOKIE);
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const sessionHash = await sha256Hex(token);
  const row = await env.DB.prepare("SELECT user_id, expires_at FROM auth_sessions WHERE id_hash = ?1")
    .bind(sessionHash)
    .first<{ user_id: string; expires_at: number }>();
  if (!row || row.expires_at < Date.now()) return null;
  return { userId: row.user_id, sessionHash, expiresAt: row.expires_at };
}

async function start(request: Request, env: AuthEnv): Promise<Response> {
  if (!authEnabled(env)) return redirect("/?auth=indisponible");
  const origin = new URL(request.url).origin;
  const state = randomToken();
  const verifier = randomToken();
  const nonce = randomToken();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${origin}/api/auth/google/callback`,
    scope: "openid",
    state,
    nonce,
    code_challenge: await pkceChallenge(verifier),
    code_challenge_method: "S256",
    prompt: "select_account",
  });
  return redirect(`${env.GOOGLE_AUTH_ENDPOINT || GOOGLE_AUTH_ENDPOINT}?${params}`, [
    cookie(FLOW_COOKIE, `${state}.${verifier}.${nonce}`, FLOW_SECONDS),
  ]);
}

async function callback(request: Request, env: AuthEnv): Promise<Response> {
  const url = new URL(request.url);
  const clearFlow = clearCookie(FLOW_COOKIE);
  const fail = (reason: string) => redirect(`/?auth=${reason}`, [clearFlow]);
  if (!authEnabled(env)) return fail("indisponible");

  const [state, verifier, nonce] = (parseCookies(request.headers.get("cookie")).get(FLOW_COOKIE) ?? "").split(".");
  // State absent ou différent : la connexion n'a pas été lancée depuis ce navigateur.
  if (!state || !verifier || !nonce || url.searchParams.get("state") !== state) return fail("erreur");
  if (url.searchParams.get("error")) return fail("annule");
  const code = url.searchParams.get("code");
  if (!code) return fail("erreur");

  const tokenRes = await fetch(env.GOOGLE_TOKEN_ENDPOINT || GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      code_verifier: verifier,
      client_id: env.GOOGLE_CLIENT_ID!,
      client_secret: env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${url.origin}/api/auth/google/callback`,
    }),
  });
  if (!tokenRes.ok) {
    console.error("Échange du code refusé par Google", tokenRes.status);
    return fail("erreur");
  }
  // Seul l'ID token est lu ; le jeton d'accès Google n'est ni utilisé ni conservé.
  const { id_token: idToken } = (await tokenRes.json()) as { id_token?: string };
  const checked = checkClaims(idToken ? decodeIdToken(idToken) : null, { clientId: env.GOOGLE_CLIENT_ID!, nonce, now: Date.now() });
  if (!checked.ok) {
    console.error("ID token refusé :", checked.error);
    return fail("erreur");
  }

  const now = Date.now();
  const user = await env.DB.prepare(
    `INSERT INTO users (id, google_sub_hash, created_at, last_login_at) VALUES (?1, ?2, ?3, ?3)
     ON CONFLICT (google_sub_hash) DO UPDATE SET last_login_at = excluded.last_login_at
     RETURNING id`,
  )
    .bind(randomToken(16), await hmacHex(env.AUTH_PEPPER!, checked.sub), now)
    .first<{ id: string }>();
  const token = randomToken();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM auth_sessions WHERE expires_at < ?1").bind(now),
    env.DB.prepare("INSERT INTO auth_sessions (id_hash, user_id, created_at, expires_at) VALUES (?1, ?2, ?3, ?4)").bind(
      await sha256Hex(token),
      user!.id,
      now,
      now + SESSION_MS,
    ),
  ]);
  return redirect("/?auth=ok", [clearFlow, cookie(SESSION_COOKIE, token, SESSION_MS / 1000)]);
}

/** Routes /api/auth/* et /api/account ; null si la route n'en fait pas partie. */
export async function handleAuth<E extends AuthEnv>(request: Request, env: E, path: string, hooks: AuthHooks<E>): Promise<Response | null> {
  if (path === "/api/auth/google/start" && request.method === "GET") return start(request, env);
  if (path === "/api/auth/google/callback" && request.method === "GET") return callback(request, env);

  if (path === "/api/auth/me" && request.method === "GET") {
    const user = await currentUser(request, env);
    if (!user) return json({ enabled: authEnabled(env), user: null });
    // Session prolongée au plus une fois par jour : on reste connecté tant qu'on utilise l'application.
    const now = Date.now();
    let setCookie: string | undefined;
    if (user.expiresAt - now < SESSION_MS - DAY_MS) {
      await env.DB.prepare("UPDATE auth_sessions SET expires_at = ?2 WHERE id_hash = ?1").bind(user.sessionHash, now + SESSION_MS).run();
      setCookie = cookie(SESSION_COOKIE, parseCookies(request.headers.get("cookie")).get(SESSION_COOKIE)!, SESSION_MS / 1000);
    }
    return json({ enabled: true, user: { id: user.userId } }, 200, setCookie);
  }

  if (path !== "/api/auth/logout" && path !== "/api/account") return null;
  if (!sameOrigin(request)) return error(403, "Origine refusée");
  const user = await currentUser(request, env);
  if (!user) return error(401, "Non connecté");

  if (path === "/api/auth/logout" && request.method === "POST") {
    let all = false;
    try {
      all = ((await request.json()) as { all?: unknown })?.all === true;
    } catch {
      // corps vide : déconnexion de cet appareil seulement
    }
    await (all
      ? env.DB.prepare("DELETE FROM auth_sessions WHERE user_id = ?1").bind(user.userId)
      : env.DB.prepare("DELETE FROM auth_sessions WHERE id_hash = ?1").bind(user.sessionHash)
    ).run();
    return json({ ok: true }, 200, clearCookie(SESSION_COOKIE));
  }

  if (path === "/api/account" && request.method === "DELETE") {
    await hooks.deleteUserData(env, user.userId);
    await env.DB.batch([
      env.DB.prepare("DELETE FROM auth_sessions WHERE user_id = ?1").bind(user.userId),
      env.DB.prepare("DELETE FROM users WHERE id = ?1").bind(user.userId),
    ]);
    return json({ deleted: true }, 200, clearCookie(SESSION_COOKIE));
  }

  return error(405, "Méthode non autorisée");
}
```

Branchement dans `worker/index.ts` :

```ts
const auth = await handleAuth(request, env, url.pathname, {
  deleteUserData: async (env, userId) => {
    // TODO : DELETE de toutes les tables applicatives WHERE user_id = ?1 (dans un batch).
  },
});
if (auth) return auth;
// Routes de l'application : const user = await currentUser(request, env) ; 401 si null ;
// pour POST/PUT/PATCH/DELETE : if (!sameOrigin(request)) return 403.
```

### Front (à adapter au framework)

- Au démarrage : `GET /api/auth/me`. Si `enabled` est faux, masquer le bouton.
- Bouton officiel « Se connecter avec Google » (charte Google : fond blanc, bordure
  `#747775`, logo « G » quatre couleurs en SVG, texte `#1f1f1f`), qui fait
  `location.assign("/api/auth/google/start")`.
- Lire `?auth=` au retour, afficher un message (« Connecté avec Google », « Connexion
  annulée », « La connexion a échoué », « pas encore activée »), puis retirer le paramètre
  avec `history.replaceState`.
- Connecté : « Se déconnecter », « Déconnecter tous mes appareils » et « Supprimer mon compte
  et mes données », chacun avec une confirmation (`window.confirm`) qui dit clairement ce
  qui sera effacé.
- Les `fetch` sont same-origin (le cookie part tout seul, le navigateur ajoute `Origin`).
  Un 401 signifie « session expirée » : proposer de se reconnecter, sans perdre ce qui est
  en cours.
- Lien « Données personnelles et confidentialité » vers `/confidentialite`.
- Si PWA avec service worker : ne jamais mettre `/api/*` en cache, et ne garder comme
  coquille de l'application que la racine (pas les pages annexes comme `/confidentialite`).

## 3. Tests obligatoires avant de me dire « c'est prêt »

1. Tests unitaires (Vitest) de `worker/oidc.ts`, au minimum ceux-ci :

```ts
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
```

2. Test de bout en bout en local :
   - `wrangler dev` avec `--var GOOGLE_CLIENT_SECRET:test-secret --var AUTH_PEPPER:test
     --var GOOGLE_AUTH_ENDPOINT:http://localhost:9999/auth --var
     GOOGLE_TOKEN_ENDPOINT:http://localhost:9999/token` ;
   - un faux serveur Google en Node, qui vérifie `scope=openid`, PKCE et `client_secret`,
     puis renvoie un ID token avec le bon `nonce` ;
   - Playwright (Chromium déjà installé) : connexion, données créées, deuxième navigateur sur
     le même compte, requête PUT depuis une origine étrangère refusée (403), déconnexion,
     puis suppression du compte et requête SQL qui prouve que les tables sont vides.
3. Montre-moi les résultats, sans jamais les enjoliver.

## 4. Guide à me dérouler, étape par étape (j'ai le navigateur, tu as le code)

Attends ma confirmation à chaque étape. Adapte les libellés si l'interface a changé.

**Étape A — Cloudflare : premier déploiement**
1. dash.cloudflare.com → compte gratuit → **Workers & Pages** → choisir le sous-domaine
   `<moi>.workers.dev` si demandé.
2. **Storage & Databases → D1 → Create** : nom `<nom-du-projet>` → me donner le
   **Database ID** (non secret) pour `wrangler.toml`.
3. Ouvrir la base → **Console** → coller le SQL de `migrations/` → **Execute** (vérifier que
   les tables apparaissent).
4. **Workers & Pages → Create → Import a repository** → dépôt GitHub. Production branch
   `main`, Build command `npm run build`, Deploy command `npx wrangler deploy`, Root `/`.
5. **Settings → Build** : désactiver les builds des branches hors production et les
   *Previews*. Sinon `wrangler preview` échoue (bloc `previews` manquant) et met un faux
   rouge sur les PR, alors que la production marche.
6. Noter l'URL : `https://<nom-du-projet>.<moi>.workers.dev`.

**Étape B — Google Cloud Console : client OAuth**
1. console.cloud.google.com → **Nouveau projet** (`<nom-du-projet>`). L'essai à 300 $ n'est pas
   nécessaire : OAuth est gratuit, et rien n'est facturé sans passage manuel à un compte payant.
2. **Google Auth Platform** (ou *APIs & Services → OAuth consent screen*) → **Get started** :
   - Branding : nom de l'application, mon e-mail de support (visible par moi seul dans la
     console, pas stocké par l'application) ;
   - Audience : **External** ;
   - Contact : mon e-mail ;
   - **Data access : n'ajouter AUCUN scope** (`openid` est implicite).
3. **Clients → Create client** → *Web application* → **Authorized redirect URIs** :
   - `https://<nom-du-projet>.<moi>.workers.dev/api/auth/google/callback`
   - `http://localhost:8787/api/auth/google/callback`
   (pas d'« Authorized JavaScript origins » nécessaire).
4. Me donner **uniquement l'ID client** (`….apps.googleusercontent.com`). **Le code secret
   reste chez moi.**
5. **Audience → Publishing status** : passer en **In production** pour que tout compte Google
   puisse se connecter. Avec le seul scope `openid` (non sensible), aucune vérification
   Google n'est exigée. Elle ne le serait que pour afficher un logo ou un nom vérifié, et un
   domaine à soi pourrait alors être nécessaire.

**Étape C — Cloudflare : secrets (dans cet ordre : tables d'abord, secrets ensuite)**
1. **Workers & Pages → <nom-du-projet> → Settings → Variables and Secrets → Add**, type
   **Secret** :
   - `GOOGLE_CLIENT_SECRET` = le code secret du client Google (copié-collé par moi) ;
   - `AUTH_PEPPER` = une chaîne aléatoire d'au moins 40 caractères (générateur de mots de
     passe). **Ne plus jamais la changer**, sinon les comptes existants ne seraient plus
     reconnus.
2. En local, me faire créer `.dev.vars` (jamais commité) avec ces deux valeurs, de test.

**Étape D — Vérifications en production**
1. `https://…/api/auth/me` répond `{"enabled":true,"user":null}`.
2. Connexion sur téléphone et sur PC avec le même compte : mêmes données.
3. Un second compte (un proche) ne voit rien des miennes.
4. « Supprimer mon compte » : D1 → Console →
   `SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM auth_sessions;` + tables applicatives :
   plus aucune ligne pour ce compte.

## 5. Pièges déjà rencontrés (à éviter d'office)

- `wrangler preview` dans les logs de build = aperçu Cloudflare, pas la production : le
  désactiver (étape A.5).
- `__Host-` exige `Secure` et `Path=/`, sans `Domain` (OK aussi sur `http://localhost` dans Chrome).
- Lier un 401 « session expirée » à un état visible, pas à une erreur silencieuse.
- Ne pas écrire en base si rien n'a changé (quota gratuit D1 : 100 000 lignes écrites / jour).
- Ne jamais logger `sub`, le cookie, le code ni les jetons (`console.error` : statut seulement).

=== FIN DU BLOC ===
````

> **Le rendre automatique** : ce bloc peut aussi devenir une *skill* Claude Code. Il suffit de
> l'enregistrer dans `.claude/skills/connexion-google/SKILL.md` d'un dépôt modèle, ou dans
> `~/.claude/skills/` sur un poste. Claude l'appliquera alors dès qu'on lui demandera une
> nouvelle application, sans copier-coller.

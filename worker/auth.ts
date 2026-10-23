/**
 * Comptes « Se connecter avec Google » (OpenID Connect, scope `openid` seul).
 *
 * - Aucune donnée personnelle : on ne reçoit de Google que l'identifiant opaque du
 *   compte (`sub`), stocké haché (HMAC avec le secret AUTH_PEPPER). Ni e-mail, ni nom,
 *   ni jeton Google conservé.
 * - Session : jeton aléatoire dans un cookie HttpOnly ; la base n'en garde que l'empreinte.
 * - Aller-retour chez Google : state + PKCE + nonce, gardés 10 minutes dans un cookie
 *   HttpOnly propre à ce navigateur.
 */
import { deleteProfile, readProfile, writeProfile } from "./db";
import { isProfileKey, mergeSnapshots, parseSnapshot } from "./model";
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

const SESSION_COOKIE = "__Host-d2r_session";
const FLOW_COOKIE = "__Host-d2r_oauth";
const DAY_MS = 86_400_000;
const SESSION_MS = 90 * DAY_MS;
const FLOW_SECONDS = 600;
const MAX_BODY_BYTES = 5_000_000;
/** Profil de données d'un compte, dans les tables existantes. */
export const accountProfileId = (userId: string) => `u:${userId}`;

const json = (data: unknown, status = 200, headers?: HeadersInit) => {
  const res = new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
  new Headers(headers).forEach((v, k) => res.headers.append(k, v));
  return res;
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

/**
 * Protection CSRF des requêtes qui modifient des données avec le cookie :
 * en plus de SameSite=Lax, l'origine doit être l'application elle-même.
 */
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
  const token = parseCookies(request.headers.get("cookie")).get(SESSION_COOKIE);
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const sessionHash = await sha256Hex(token);
  const row = await env.DB.prepare("SELECT user_id, expires_at FROM auth_sessions WHERE id_hash = ?1")
    .bind(sessionHash)
    .first<{ user_id: string; expires_at: number }>();
  if (!row || row.expires_at < Date.now()) return null;
  return { userId: row.user_id, sessionHash, expiresAt: row.expires_at };
}

async function readJson(request: Request): Promise<unknown> {
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) throw new RangeError();
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

/** Démarre la connexion : redirection vers Google. */
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

/** Retour de Google : échange du code, compte et session. */
async function callback(request: Request, env: AuthEnv): Promise<Response> {
  const url = new URL(request.url);
  const clearFlow = clearCookie(FLOW_COOKIE);
  const fail = (reason: string) => redirect(`/?auth=${reason}`, [clearFlow]);
  if (!authEnabled(env)) return fail("indisponible");

  const [state, verifier, nonce] = (parseCookies(request.headers.get("cookie")).get(FLOW_COOKIE) ?? "").split(".");
  // State absent ou différent : requête qui n'a pas été lancée depuis ce navigateur.
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
  const subHash = await hmacHex(env.AUTH_PEPPER!, checked.sub);
  const user = await env.DB.prepare(
    `INSERT INTO users (id, google_sub_hash, created_at, last_login_at) VALUES (?1, ?2, ?3, ?3)
     ON CONFLICT (google_sub_hash) DO UPDATE SET last_login_at = excluded.last_login_at
     RETURNING id`,
  )
    .bind(randomToken(16), subHash, now)
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
export async function handleAuth(request: Request, env: AuthEnv, path: string): Promise<Response | null> {
  if (path === "/api/auth/google/start" && request.method === "GET") return start(request, env);
  if (path === "/api/auth/google/callback" && request.method === "GET") return callback(request, env);

  if (path === "/api/auth/me" && request.method === "GET") {
    const user = authEnabled(env) ? await currentUser(request, env) : null;
    if (!user) return json({ enabled: authEnabled(env), user: null });
    const row = await env.DB.prepare("SELECT created_at FROM users WHERE id = ?1").bind(user.userId).first<{ created_at: number }>();
    if (!row) return json({ enabled: true, user: null });
    // Session prolongée (au plus une écriture par jour) : on reste connecté tant qu'on utilise l'application.
    const now = Date.now();
    const renew = user.expiresAt - now < SESSION_MS - DAY_MS;
    if (renew) {
      await env.DB.prepare("UPDATE auth_sessions SET expires_at = ?2 WHERE id_hash = ?1").bind(user.sessionHash, now + SESSION_MS).run();
    }
    const token = parseCookies(request.headers.get("cookie")).get(SESSION_COOKIE)!;
    return json(
      { enabled: true, user: { id: user.userId, createdAt: row.created_at } },
      200,
      renew ? { "set-cookie": cookie(SESSION_COOKIE, token, SESSION_MS / 1000) } : undefined,
    );
  }

  const known = ["/api/auth/logout", "/api/auth/adopt", "/api/account"];
  if (!known.includes(path)) return null;
  if (!sameOrigin(request)) return error(403, "Origine refusée");
  const user = await currentUser(request, env);
  if (!user) return error(401, "Non connecté");

  if (path === "/api/auth/logout" && request.method === "POST") {
    const body = (await readJson(request)) as { all?: unknown } | undefined;
    const stmt = body?.all === true
      ? env.DB.prepare("DELETE FROM auth_sessions WHERE user_id = ?1").bind(user.userId)
      : env.DB.prepare("DELETE FROM auth_sessions WHERE id_hash = ?1").bind(user.sessionHash);
    await stmt.run();
    return json({ ok: true }, 200, { "set-cookie": clearCookie(SESSION_COOKIE) });
  }

  if (path === "/api/account" && request.method === "DELETE") {
    await deleteProfile(env.DB, accountProfileId(user.userId));
    await env.DB.batch([
      env.DB.prepare("DELETE FROM auth_sessions WHERE user_id = ?1").bind(user.userId),
      env.DB.prepare("DELETE FROM users WHERE id = ?1").bind(user.userId),
    ]);
    return json({ deleted: true }, 200, { "set-cookie": clearCookie(SESSION_COOKIE) });
  }

  if (path === "/api/auth/adopt" && request.method === "POST") {
    // Première connexion sur cet appareil : ses données rejoignent celles du compte.
    let body: unknown;
    try {
      body = await readJson(request);
    } catch {
      return error(413, "Données trop volumineuses");
    }
    const { snapshot, profileKey } = (body ?? {}) as { snapshot?: unknown; profileKey?: unknown };
    const parsed = parseSnapshot(snapshot);
    if (!parsed.ok) return error(422, parsed.error);
    const profileId = accountProfileId(user.userId);
    const account = (await readProfile(env.DB, profileId)) ?? { characters: [], customRoutes: [], sessions: [] };
    const merged = mergeSnapshots(account, parsed.value);
    const { updatedAt } = await writeProfile(env.DB, profileId, merged, Date.now());
    // Le profil anonyme de l'appareil est désormais inutile : on l'efface.
    if (typeof profileKey === "string" && isProfileKey(profileKey)) await deleteProfile(env.DB, await sha256Hex(profileKey));
    return json({ ...merged, updatedAt });
  }

  return error(405, "Méthode non autorisée");
}

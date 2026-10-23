/**
 * Worker D2R Run Counter.
 * - /api/* : API JSON adossée à Cloudflare D1 (binding DB).
 * - le reste : application (PWA) servie depuis les assets statiques (binding ASSETS).
 */
import { accountProfileId, currentUser, handleAuth, sameOrigin, type AuthEnv } from "./auth";
import { deleteProfile, readProfile, writeProfile } from "./db";
import { isProfileKey, parseSnapshot } from "./model";
import { sha256Hex } from "./oidc";

export interface Env extends AuthEnv {
  ASSETS: Fetcher;
}

const MAX_BODY_BYTES = 5_000_000;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

const error = (status: number, message: string) => json({ error: message }, status);

async function handleApi(request: Request, env: Env, path: string): Promise<Response> {
  if (path === "/api/health") return json({ ok: true });

  const auth = await handleAuth(request, env, path);
  if (auth) return auth;

  if (path !== "/api/data") return error(404, "Route inconnue");
  // Deux modes : clé de profil anonyme (en-tête), ou compte Google (cookie de session).
  // Seule l'empreinte SHA-256 de la clé est stockée, jamais la clé elle-même.
  let profileId: string;
  const key = request.headers.get("x-profile-key");
  if (key !== null) {
    if (!isProfileKey(key)) return error(401, "En-tête X-Profile-Key invalide");
    profileId = await sha256Hex(key);
  } else {
    if (request.method !== "GET" && !sameOrigin(request)) return error(403, "Origine refusée");
    const user = await currentUser(request, env);
    if (!user) return error(401, "Non connecté");
    profileId = accountProfileId(user.userId);
  }

  switch (request.method) {
    case "GET": {
      const data = await readProfile(env.DB, profileId);
      return json(data ?? { exists: false });
    }
    case "PUT": {
      const length = Number(request.headers.get("content-length") ?? 0);
      if (length > MAX_BODY_BYTES) return error(413, "Données trop volumineuses");
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return error(400, "JSON invalide");
      }
      const parsed = parseSnapshot(body);
      if (!parsed.ok) return error(422, parsed.error);
      return json(await writeProfile(env.DB, profileId, parsed.value, Date.now()));
    }
    case "DELETE":
      await deleteProfile(env.DB, profileId);
      return json({ deleted: true });
    default:
      return error(405, "Méthode non autorisée");
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      try {
        return await handleApi(request, env, url.pathname);
      } catch (e) {
        console.error(e);
        return error(500, "Erreur interne");
      }
    }
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;

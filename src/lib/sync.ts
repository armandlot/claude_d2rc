import type { Character } from "./characters";
import type { CustomRoute } from "./customRoutes";
import type { SavedSession } from "./stats";

export interface Snapshot {
  characters: Character[];
  customRoutes: CustomRoute[];
  sessions: SavedSession[];
}

/** État de synchronisation mémorisé sur l'appareil. */
export interface SyncMeta {
  /** `updatedAt` du serveur lors du dernier alignement (null : jamais synchronisé). */
  syncedAt: number | null;
  /** Modifications locales pas encore envoyées. */
  dirty: boolean;
  /** Heure de la dernière modification locale (ms). */
  changedAt: number;
}

export const INITIAL_META: SyncMeta = { syncedAt: null, dirty: false, changedAt: 0 };

export type SyncDecision = "push" | "pull" | "none";

/**
 * Que faire en comparant l'appareil et le serveur ?
 * - serveur vide : on envoie les données locales (s'il y en a) ;
 * - appareil jamais aligné face à un profil existant : on récupère toujours
 *   (un appareil neuf ou fraîchement relié n'écrase jamais un profil) ;
 * - serveur inchangé depuis le dernier alignement : on envoie si l'appareil a changé ;
 * - serveur modifié ailleurs : on récupère, sauf si l'appareil a aussi changé plus
 *   récemment (la dernière modification l'emporte).
 */
export function decideSync(meta: SyncMeta, remoteUpdatedAt: number | null, hasLocalData: boolean): SyncDecision {
  if (remoteUpdatedAt === null) return hasLocalData || meta.dirty ? "push" : "none";
  if (meta.syncedAt === null) return "pull";
  if (remoteUpdatedAt === meta.syncedAt) return meta.dirty ? "push" : "none";
  if (!meta.dirty) return "pull";
  return meta.changedAt > remoteUpdatedAt ? "push" : "pull";
}

export function hasData(s: Snapshot): boolean {
  return s.characters.length + s.customRoutes.length + s.sessions.length > 0;
}

/** Clé de profil aléatoire (32 caractères URL-safe, 192 bits). */
export function newProfileKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function isProfileKey(key: string): boolean {
  return /^[A-Za-z0-9_-]{22,64}$/.test(key);
}

export class ApiUnavailable extends Error {}

const API = "/api/data";

async function call<T>(key: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(API, { ...init, headers: { "x-profile-key": key, "content-type": "application/json" } });
  } catch {
    throw new ApiUnavailable("réseau indisponible");
  }
  // Pas d'API (hébergement statique, ex. GitHub Pages) : réponse HTML ou 404.
  if (!(res.headers.get("content-type") ?? "").includes("application/json")) throw new ApiUnavailable("pas d'API");
  const body = await res.json();
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `Erreur ${res.status}`);
  return body as T;
}

export const api = {
  get: (key: string) => call<(Snapshot & { updatedAt: number }) | { exists: false }>(key),
  put: (key: string, data: Snapshot) => call<{ updatedAt: number; written: number; deleted: number }>(key, { method: "PUT", body: JSON.stringify(data) }),
};

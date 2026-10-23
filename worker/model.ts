/**
 * Validation et normalisation des données échangées avec l'application.
 * Module pur (aucune dépendance Cloudflare) : testé avec Vitest.
 */
import type { Character } from "../src/lib/characters";
import type { CustomRoute } from "../src/lib/customRoutes";
import type { SavedSession } from "../src/lib/stats";

export interface Snapshot {
  characters: Character[];
  customRoutes: CustomRoute[];
  sessions: SavedSession[];
}

export const LIMITS = { characters: 200, customRoutes: 200, sessions: 20_000 };

const CLASS_IDS = new Set(["amazon", "assassin", "barbarian", "druid", "necromancer", "paladin", "sorceress"]);

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, max: number): v is string => typeof v === "string" && v.length <= max;
const id = (v: unknown): v is string => typeof v === "string" && /^[\w.:-]{1,80}$/.test(v);
const int = (v: unknown, min: number, max: number): v is number => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;

function character(v: unknown, i: number): Result<Character> {
  if (!isObj(v)) return { ok: false, error: `characters[${i}] : objet attendu` };
  if (!id(v.id)) return { ok: false, error: `characters[${i}].id invalide` };
  if (!str(v.classId, 20) || !CLASS_IDS.has(v.classId)) return { ok: false, error: `characters[${i}].classId invalide` };
  if (!str(v.spec, 60) || !str(v.name ?? "", 40)) return { ok: false, error: `characters[${i}] : texte trop long` };
  if (!int(v.magicFind, 0, 5000)) return { ok: false, error: `characters[${i}].magicFind invalide` };
  return {
    ok: true,
    value: {
      id: v.id,
      name: (v.name as string | undefined) ?? "",
      classId: v.classId as Character["classId"],
      spec: v.spec,
      magicFind: v.magicFind,
      ladder: v.ladder !== false,
      hardcore: v.hardcore === true,
    },
  };
}

function customRoute(v: unknown, i: number): Result<CustomRoute> {
  if (!isObj(v)) return { ok: false, error: `customRoutes[${i}] : objet attendu` };
  if (!id(v.id) || !str(v.name ?? "", 80)) return { ok: false, error: `customRoutes[${i}] invalide` };
  if (!Array.isArray(v.stops) || v.stops.length > 30 || !v.stops.every(id)) return { ok: false, error: `customRoutes[${i}].stops invalide` };
  return { ok: true, value: { id: v.id, name: (v.name as string | undefined) ?? "", stops: v.stops as string[] } };
}

function session(v: unknown, i: number): Result<SavedSession> {
  if (!isObj(v)) return { ok: false, error: `sessions[${i}] : objet attendu` };
  if (!id(v.id) || !id(v.characterId) || !id(v.routeId)) return { ok: false, error: `sessions[${i}] : identifiant invalide` };
  if (!str(v.date, 40) || Number.isNaN(Date.parse(v.date))) return { ok: false, error: `sessions[${i}].date invalide` };
  if (!int(v.magicFind, 0, 5000) || !int(v.players, 1, 8)) return { ok: false, error: `sessions[${i}] : MF ou /players invalide` };
  if (!int(v.durationSeconds, 0, 7 * 24 * 3600) || !int(v.runs, 0, 100_000)) return { ok: false, error: `sessions[${i}] : durée ou runs invalide` };
  if (!isObj(v.counts) || Object.keys(v.counts).length > 30 || !Object.entries(v.counts).every(([k, n]) => id(k) && int(n, 0, 1_000_000))) {
    return { ok: false, error: `sessions[${i}].counts invalide` };
  }
  const items = v.items ?? [];
  if (
    !Array.isArray(items) ||
    items.length > 500 ||
    !items.every((it) => isObj(it) && id(it.id) && str(it.name, 80) && str(it.value ?? "", 40) && str(it.nameFr ?? "", 80))
  ) {
    return { ok: false, error: `sessions[${i}].items invalide` };
  }
  return {
    ok: true,
    value: {
      id: v.id,
      date: v.date,
      characterId: v.characterId,
      routeId: v.routeId,
      magicFind: v.magicFind,
      players: v.players,
      durationSeconds: v.durationSeconds,
      runs: v.runs,
      counts: v.counts as SavedSession["counts"],
      items: items as SavedSession["items"],
    },
  };
}

function list<T>(v: unknown, name: string, max: number, parse: (x: unknown, i: number) => Result<T>): Result<T[]> {
  if (!Array.isArray(v)) return { ok: false, error: `${name} : tableau attendu` };
  if (v.length > max) return { ok: false, error: `${name} : ${max} éléments maximum` };
  const out: T[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < v.length; i++) {
    const r = parse(v[i], i);
    if (!r.ok) return r;
    const key = (r.value as { id: string }).id;
    if (seen.has(key)) return { ok: false, error: `${name} : identifiant en double (${key})` };
    seen.add(key);
    out.push(r.value);
  }
  return { ok: true, value: out };
}

/** Vérifie le corps d'un PUT /api/data. */
export function parseSnapshot(body: unknown): Result<Snapshot> {
  if (!isObj(body)) return { ok: false, error: "Objet JSON attendu" };
  const characters = list(body.characters, "characters", LIMITS.characters, character);
  if (!characters.ok) return characters;
  const customRoutes = list(body.customRoutes, "customRoutes", LIMITS.customRoutes, customRoute);
  if (!customRoutes.ok) return customRoutes;
  const sessions = list(body.sessions, "sessions", LIMITS.sessions, session);
  if (!sessions.ok) return sessions;
  return { ok: true, value: { characters: characters.value, customRoutes: customRoutes.value, sessions: sessions.value } };
}

/** Clé de profil : 22 à 64 caractères URL-safe (générée par l'application). */
export function isProfileKey(key: string | null): key is string {
  return !!key && /^[A-Za-z0-9_-]{22,64}$/.test(key);
}

/**
 * Compare l'existant et le nouvel état (valeurs déjà sérialisées par id).
 * Seules les lignes nouvelles ou modifiées sont réécrites : D1 gratuit limite
 * le nombre de lignes écrites par jour.
 */
export function planChanges(existing: Map<string, string>, incoming: Map<string, string>): { upsert: string[]; remove: string[] } {
  const upsert = [...incoming].filter(([k, v]) => existing.get(k) !== v).map(([k]) => k);
  const remove = [...existing.keys()].filter((k) => !incoming.has(k));
  return { upsert, remove };
}

export { canonical } from "../src/lib/canonical";

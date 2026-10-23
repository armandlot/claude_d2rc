/** Accès D1 : lecture d'un profil et écriture différentielle. */
import type { Character } from "../src/lib/characters";
import type { CustomRoute } from "../src/lib/customRoutes";
import type { SavedSession } from "../src/lib/stats";
import { canonical, planChanges, type Snapshot } from "./model";

// D1 accepte des valeurs liées jusqu'à 2 Mo : on découpe les gros lots JSON.
const CHUNK_BYTES = 900_000;

interface CharacterRow {
  id: string;
  position: number;
  name: string;
  class_id: string;
  spec: string;
  magic_find: number;
  ladder: number;
  hardcore: number;
}
interface RouteRow {
  id: string;
  position: number;
  name: string;
  stops: string;
}
interface SessionRow {
  id: string;
  date: string;
  character_id: string;
  route_id: string;
  magic_find: number;
  players: number;
  duration_seconds: number;
  runs: number;
  counts: string;
  items: string;
}

const toCharacter = (r: CharacterRow): Character => ({
  id: r.id,
  name: r.name,
  classId: r.class_id as Character["classId"],
  spec: r.spec,
  magicFind: r.magic_find,
  ladder: r.ladder === 1,
  hardcore: r.hardcore === 1,
});
const toRoute = (r: RouteRow): CustomRoute => ({ id: r.id, name: r.name, stops: JSON.parse(r.stops) });
const toSession = (r: SessionRow): SavedSession => ({
  id: r.id,
  date: r.date,
  characterId: r.character_id,
  routeId: r.route_id,
  magicFind: r.magic_find,
  players: r.players,
  durationSeconds: r.duration_seconds,
  runs: r.runs,
  counts: JSON.parse(r.counts),
  items: JSON.parse(r.items),
});

export async function readProfile(db: D1Database, profileId: string): Promise<(Snapshot & { updatedAt: number }) | null> {
  const [profile, characters, routes, sessions] = await db.batch([
    db.prepare("SELECT updated_at FROM profiles WHERE id = ?1").bind(profileId),
    db.prepare("SELECT * FROM characters WHERE profile_id = ?1 ORDER BY position").bind(profileId),
    db.prepare("SELECT * FROM custom_routes WHERE profile_id = ?1 ORDER BY position").bind(profileId),
    db.prepare("SELECT * FROM sessions WHERE profile_id = ?1 ORDER BY date DESC").bind(profileId),
  ]);
  const row = profile.results[0] as { updated_at: number } | undefined;
  if (!row) return null;
  return {
    updatedAt: row.updated_at,
    characters: (characters.results as unknown as CharacterRow[]).map(toCharacter),
    customRoutes: (routes.results as unknown as RouteRow[]).map(toRoute),
    sessions: (sessions.results as unknown as SessionRow[]).map(toSession),
  };
}

/** Découpe une liste en lots JSON de taille raisonnable. */
function chunks<T>(items: T[]): string[] {
  const out: string[] = [];
  let current: T[] = [];
  let size = 2;
  for (const item of items) {
    const len = JSON.stringify(item).length + 1;
    if (current.length && size + len > CHUNK_BYTES) {
      out.push(JSON.stringify(current));
      current = [];
      size = 2;
    }
    current.push(item);
    size += len;
  }
  if (current.length) out.push(JSON.stringify(current));
  return out;
}

const UPSERT = {
  characters: `INSERT INTO characters (profile_id, id, position, name, class_id, spec, magic_find, ladder, hardcore)
    SELECT ?1, json_extract(value, '$.id'), json_extract(value, '$.position'), json_extract(value, '$.name'),
           json_extract(value, '$.classId'), json_extract(value, '$.spec'), json_extract(value, '$.magicFind'),
           json_extract(value, '$.ladder'), json_extract(value, '$.hardcore')
    FROM json_each(?2) WHERE true
    ON CONFLICT (profile_id, id) DO UPDATE SET position = excluded.position, name = excluded.name,
      class_id = excluded.class_id, spec = excluded.spec, magic_find = excluded.magic_find,
      ladder = excluded.ladder, hardcore = excluded.hardcore`,
  custom_routes: `INSERT INTO custom_routes (profile_id, id, position, name, stops)
    SELECT ?1, json_extract(value, '$.id'), json_extract(value, '$.position'), json_extract(value, '$.name'),
           json(json_extract(value, '$.stops'))
    FROM json_each(?2) WHERE true
    ON CONFLICT (profile_id, id) DO UPDATE SET position = excluded.position, name = excluded.name, stops = excluded.stops`,
  sessions: `INSERT INTO sessions (profile_id, id, date, character_id, route_id, magic_find, players,
                                   duration_seconds, runs, counts, items)
    SELECT ?1, json_extract(value, '$.id'), json_extract(value, '$.date'), json_extract(value, '$.characterId'),
           json_extract(value, '$.routeId'), json_extract(value, '$.magicFind'), json_extract(value, '$.players'),
           json_extract(value, '$.durationSeconds'), json_extract(value, '$.runs'),
           json(json_extract(value, '$.counts')), json(json_extract(value, '$.items'))
    FROM json_each(?2) WHERE true
    ON CONFLICT (profile_id, id) DO UPDATE SET date = excluded.date, character_id = excluded.character_id,
      route_id = excluded.route_id, magic_find = excluded.magic_find, players = excluded.players,
      duration_seconds = excluded.duration_seconds, runs = excluded.runs, counts = excluded.counts, items = excluded.items`,
};

type Table = keyof typeof UPSERT;

/**
 * Remplace les données d'un profil par `next`, en n'écrivant que les différences.
 * Toutes les écritures partent dans un seul batch D1, exécuté comme une transaction.
 */
export async function writeProfile(db: D1Database, profileId: string, next: Snapshot, now: number) {
  const current = await readProfile(db, profileId);

  // Lignes au format stocké (avec position pour l'ordre d'affichage).
  const incoming: Record<Table, { id: string }[]> = {
    characters: next.characters.map((c, position) => ({ ...c, position, ladder: c.ladder ? 1 : 0, hardcore: c.hardcore ? 1 : 0 })),
    custom_routes: next.customRoutes.map((r, position) => ({ ...r, position })),
    sessions: next.sessions.map((s) => ({ ...s, items: s.items ?? [] })),
  };
  const existing: Record<Table, { id: string }[]> = {
    characters: (current?.characters ?? []).map((c, position) => ({ ...c, position, ladder: c.ladder ? 1 : 0, hardcore: c.hardcore ? 1 : 0 })),
    custom_routes: (current?.customRoutes ?? []).map((r, position) => ({ ...r, position })),
    sessions: (current?.sessions ?? []).map((s) => ({ ...s, items: s.items ?? [] })),
  };

  const statements: D1PreparedStatement[] = [
    db
      .prepare(
        `INSERT INTO profiles (id, created_at, updated_at) VALUES (?1, ?2, ?2)
         ON CONFLICT (id) DO UPDATE SET updated_at = excluded.updated_at`,
      )
      .bind(profileId, now),
  ];
  let written = 0;
  let deleted = 0;
  for (const table of Object.keys(UPSERT) as Table[]) {
    const byId = (rows: { id: string }[]) => new Map(rows.map((r) => [r.id, canonical(r)]));
    const plan = planChanges(byId(existing[table]), byId(incoming[table]));
    const changed = incoming[table].filter((r) => plan.upsert.includes(r.id));
    for (const chunk of chunks(changed)) statements.push(db.prepare(UPSERT[table]).bind(profileId, chunk));
    for (const chunk of chunks(plan.remove)) {
      statements.push(
        db.prepare(`DELETE FROM ${table} WHERE profile_id = ?1 AND id IN (SELECT value FROM json_each(?2))`).bind(profileId, chunk),
      );
    }
    written += changed.length;
    deleted += plan.remove.length;
  }
  // Rien n'a changé : on ne touche pas à la date, pour ne pas réveiller les autres appareils.
  if (current && written === 0 && deleted === 0) return { updatedAt: current.updatedAt, written, deleted };
  await db.batch(statements);
  return { updatedAt: now, written, deleted };
}

export async function deleteProfile(db: D1Database, profileId: string) {
  await db.batch(
    ["sessions", "custom_routes", "characters", "profiles"].map((table) =>
      db.prepare(`DELETE FROM ${table} WHERE ${table === "profiles" ? "id" : "profile_id"} = ?1`).bind(profileId),
    ),
  );
}

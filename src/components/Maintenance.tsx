import { useMemo, useState } from "react";
import { DROP_CATEGORIES } from "../data/drops";
import { ROUTES, type Route } from "../data/routes";
import { characterLabel, type Character } from "../lib/characters";
import { customRouteName, type CustomRoute } from "../lib/customRoutes";
import { parseDuration, sessionErrors, toLocalInput } from "../lib/maintenance";
import { usePersistentState } from "../lib/storage";
import { emptyCounts, perHour, runeTotal, type SavedSession } from "../lib/stats";
import { formatDuration, formatRate } from "../format";

interface Props {
  characters: Character[];
  customRoutes: CustomRoute[];
  routes: Record<string, Route>;
  sessions: SavedSession[];
  onUpdate: (session: SavedSession) => void;
  onDelete: (id: string) => void;
  onReview: (id: string) => void;
}

/** Session en cours, telle que la stocke l'onglet Session (lecture seule ici, sauf abandon). */
interface StoredActive {
  characterId: string;
  routeId: string;
  startedAt: number;
  events: unknown[];
}

export default function Maintenance({ characters, customRoutes, routes, sessions, onUpdate, onDelete, onReview }: Props) {
  const [characterFilter, setCharacterFilter] = useState("all");
  const [routeFilter, setRouteFilter] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [active, setActive] = usePersistentState<StoredActive | null>("v3:active-session", null);
  const [confirmAbandon, setConfirmAbandon] = useState(false);

  const byId = useMemo(() => Object.fromEntries(characters.map((c) => [c.id, c])), [characters]);
  const shown = sessions
    .filter((s) => (characterFilter === "all" || s.characterId === characterFilter) && (routeFilter === "all" || s.routeId === routeFilter))
    .sort((a, b) => b.date.localeCompare(a.date));
  const totals = shown.reduce(
    (t, s) => ({ runs: t.runs + s.runs, seconds: t.seconds + s.durationSeconds, uniques: t.uniques + (s.counts.unique ?? 0) }),
    { runs: 0, seconds: 0, uniques: 0 },
  );
  const usedRoutes = [...new Set(sessions.map((s) => s.routeId))];

  return (
    <div className="stack">
      <section className="panel maintenance-intro">
        <h2>Maintenance</h2>
        <p className="hint">
          Explorez vos sessions enregistrées et corrigez-les : mauvais personnage, run compté en trop, drop oublié…
          Les modifications sont immédiates et changent la Comparaison.
        </p>
      </section>

      {active && (
        <section className="panel">
          <h3>Session en cours</h3>
          <p>
            {routes[active.routeId]?.name ?? "Route supprimée"} ·{" "}
            {byId[active.characterId] ? characterLabel(byId[active.characterId]) : "Personnage supprimé"} · démarrée le{" "}
            {new Date(active.startedAt).toLocaleString("fr-FR")} · {active.events.length} action(s)
          </p>
          {confirmAbandon ? (
            <div className="actions">
              <span>Abandonner cette session sans l'enregistrer ?</span>
              <button className="secondary danger" onClick={() => { setActive(null); setConfirmAbandon(false); }}>
                Abandonner
              </button>
              <button className="secondary" onClick={() => setConfirmAbandon(false)}>
                Garder
              </button>
            </div>
          ) : (
            <button className="secondary" onClick={() => setConfirmAbandon(true)}>
              Abandonner la session en cours
            </button>
          )}
        </section>
      )}

      <section className="panel">
        <div className="toolbar">
          <h3>Sessions enregistrées</h3>
          <label>
            Personnage
            <select id="mnt-character" value={characterFilter} onChange={(e) => setCharacterFilter(e.target.value)}>
              <option value="all">Tous</option>
              {characters.map((c) => (
                <option key={c.id} value={c.id}>
                  {characterLabel(c)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Route
            <select id="mnt-route" value={routeFilter} onChange={(e) => setRouteFilter(e.target.value)}>
              <option value="all">Toutes</option>
              {usedRoutes.map((id) => (
                <option key={id} value={id}>
                  {routes[id]?.name ?? "Route supprimée"}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="hint">
          {shown.length} session{shown.length > 1 ? "s" : ""} · {totals.runs} runs · {formatDuration(totals.seconds)} de jeu ·{" "}
          {totals.uniques} uniques
        </p>

        {shown.length === 0 ? (
          <p className="hint">Aucune session ne correspond.</p>
        ) : (
          <ul className="mnt-list">
            {shown.map((s) =>
              editingId === s.id ? (
                <li key={s.id} className="editing">
                  <SessionEditor
                    session={s}
                    characters={characters}
                    customRoutes={customRoutes}
                    routes={routes}
                    onCancel={() => setEditingId(null)}
                    onSave={(next) => {
                      onUpdate(next);
                      setEditingId(null);
                    }}
                    onDelete={() => {
                      onDelete(s.id);
                      setEditingId(null);
                    }}
                    onReview={() => onReview(s.id)}
                  />
                </li>
              ) : (
                <li key={s.id}>
                  <button className="mnt-row" onClick={() => setEditingId(s.id)} aria-label={`Modifier la session du ${new Date(s.date).toLocaleString("fr-FR")}`}>
                    <span className="mnt-date">{new Date(s.date).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</span>
                    <span className="mnt-what">
                      <strong>{routes[s.routeId]?.name ?? "Route supprimée"}</strong>
                      <small>{byId[s.characterId] ? characterLabel(byId[s.characterId]) : "Personnage supprimé"} · {s.magicFind} % MF</small>
                    </span>
                    <span className="mnt-figures">
                      {s.runs} runs · {formatDuration(s.durationSeconds)} · {s.counts.unique ?? 0} U · {s.counts.set ?? 0} S ·{" "}
                      {runeTotal({ ...emptyCounts(), ...s.counts })} R{s.items?.length ? ` · ${s.items.length} obj.` : ""}
                    </span>
                    <span className="mnt-edit">Modifier ›</span>
                  </button>
                </li>
              ),
            )}
          </ul>
        )}
      </section>
    </div>
  );
}

function SessionEditor({
  session,
  characters,
  customRoutes,
  routes,
  onSave,
  onCancel,
  onDelete,
  onReview,
}: {
  session: SavedSession;
  characters: Character[];
  customRoutes: CustomRoute[];
  routes: Record<string, Route>;
  onSave: (s: SavedSession) => void;
  onCancel: () => void;
  onDelete: () => void;
  onReview: () => void;
}) {
  const [draft, setDraft] = useState<SavedSession>({ ...session, counts: { ...emptyCounts(), ...session.counts } });
  const [durationText, setDurationText] = useState(formatDuration(session.durationSeconds));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const parsedDuration = parseDuration(durationText);
  const candidate = { ...draft, durationSeconds: parsedDuration ?? 0 };
  const errors = [
    ...(parsedDuration === null ? ["Durée illisible : utilisez h:mm:ss, mm:ss, « 90 » (minutes) ou « 1h30 »."] : []),
    ...sessionErrors(candidate, { characters: new Set(characters.map((c) => c.id)), routes: new Set(Object.keys(routes)) }).filter(
      (e) => parsedDuration !== null || !e.startsWith("La durée"),
    ),
  ];
  const update = (patch: Partial<SavedSession>) => setDraft((d) => ({ ...d, ...patch }));
  const setCount = (kind: string, value: string) =>
    setDraft((d) => ({ ...d, counts: { ...d.counts, [kind]: value === "" ? 0 : Number(value) } }));
  const int = (v: string) => (v === "" ? 0 : Number(v));
  const hours = candidate.durationSeconds;

  return (
    <form
      className="mnt-editor"
      onSubmit={(e) => {
        e.preventDefault();
        if (!errors.length) onSave(candidate);
      }}
    >
      <div className="setup-grid">
        <label>
          Personnage
          <select id="edit-character" value={draft.characterId} onChange={(e) => update({ characterId: e.target.value })}>
            {!characters.some((c) => c.id === draft.characterId) && <option value={draft.characterId}>Personnage supprimé</option>}
            {characters.map((c) => (
              <option key={c.id} value={c.id}>
                {characterLabel(c)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Route
          <select id="edit-route" value={draft.routeId} onChange={(e) => update({ routeId: e.target.value })}>
            {!routes[draft.routeId] && <option value={draft.routeId}>Route supprimée</option>}
            {customRoutes.length > 0 && (
              <optgroup label="Mes routes custom">
                {customRoutes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {customRouteName(r)}
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label="Routes classiques">
              {ROUTES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        <label>
          Date
          <input
            id="edit-date"
            type="datetime-local"
            value={toLocalInput(draft.date)}
            onChange={(e) => e.target.value && update({ date: new Date(e.target.value).toISOString() })}
          />
        </label>
        <label>
          Magic Find (%)
          <input id="edit-mf" type="number" min={0} inputMode="numeric" value={draft.magicFind} onChange={(e) => update({ magicFind: int(e.target.value) })} />
        </label>
        <label>
          /players
          <input id="edit-players" type="number" min={1} max={8} inputMode="numeric" value={draft.players} onChange={(e) => update({ players: int(e.target.value) })} />
        </label>
        <label>
          Durée (hors pauses)
          <input id="edit-duration" value={durationText} onChange={(e) => setDurationText(e.target.value)} placeholder="h:mm:ss" />
        </label>
        <label>
          Runs
          <input id="edit-runs" type="number" min={1} inputMode="numeric" value={draft.runs} onChange={(e) => update({ runs: int(e.target.value) })} />
        </label>
      </div>

      <fieldset className="mnt-counts">
        <legend>Drops comptés</legend>
        {DROP_CATEGORIES.map((c) => (
          <label key={c.kind} className={`k-${c.kind}`}>
            <span className="drop-label">{c.label}</span>
            <input
              id={`edit-${c.kind}`}
              type="number"
              min={0}
              inputMode="numeric"
              value={draft.counts[c.kind]}
              onChange={(e) => setCount(c.kind, e.target.value)}
            />
          </label>
        ))}
      </fieldset>

      <p className="hint">
        Après modification : {candidate.runs > 0 && hours > 0 ? formatDuration(hours / candidate.runs) : "—"} par run ·{" "}
        {formatRate(perHour(candidate.counts.unique, hours))} uniques/h · {formatRate(perHour(candidate.counts.set, hours))} sets/h ·{" "}
        {formatRate(perHour(runeTotal(candidate.counts), hours))} runes/h
      </p>

      {errors.length > 0 && (
        <ul className="mnt-errors" role="alert">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      <div className="actions">
        <button type="submit" className="primary" disabled={errors.length > 0}>
          Enregistrer les modifications
        </button>
        <button type="button" className="secondary" onClick={onCancel}>
          Annuler
        </button>
        <button type="button" className="link" onClick={onReview}>
          Objets identifiés ({session.items?.length ?? 0})
        </button>
        {confirmDelete ? (
          <>
            <button type="button" className="secondary danger" onClick={onDelete}>
              Confirmer la suppression
            </button>
            <button type="button" className="link" onClick={() => setConfirmDelete(false)}>
              garder
            </button>
          </>
        ) : (
          <button type="button" className="link danger" onClick={() => setConfirmDelete(true)}>
            Supprimer la session
          </button>
        )}
      </div>
    </form>
  );
}

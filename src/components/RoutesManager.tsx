import { useState } from "react";
import { ROUTES } from "../data/routes";
import { STOPS, STOPS_BY_ID } from "../data/stops";
import { customRouteName, moveStop, newCustomRouteId, stopsLabel, type CustomRoute } from "../lib/customRoutes";
import { aggregateSessions, perHour, type SavedSession } from "../lib/stats";
import { characterLabel, type Character } from "../lib/characters";
import { formatDuration, formatRate } from "../format";

interface Props {
  customRoutes: CustomRoute[];
  characters: Character[];
  sessions: SavedSession[];
  onSave: (route: CustomRoute) => void;
  onDelete: (id: string) => void;
  onPlay: (id: string) => void;
}

const ACTS = [1, 2, 3, 4, 5] as const;

export default function RoutesManager({ customRoutes, characters, sessions, onSave, onDelete, onPlay }: Props) {
  const [editing, setEditing] = useState<CustomRoute | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  return (
    <div className="stack">
      {editing ? (
        <RouteForm
          key={editing.id}
          initial={editing}
          isNew={!customRoutes.some((r) => r.id === editing.id)}
          onCancel={() => setEditing(null)}
          onSubmit={(r) => {
            onSave(r);
            setEditing(null);
          }}
        />
      ) : (
        <button className="primary add-character" onClick={() => setEditing({ id: newCustomRouteId(), name: "", stops: [] })}>
          + Nouvelle route custom
        </button>
      )}

      {customRoutes.length === 0 && !editing && (
        <section className="panel empty">
          <h2>Aucune route custom</h2>
          <p className="hint">
            Enchaînez plusieurs boss ou zones dans une même partie, par exemple Pindleskin → Mephisto → Summoner →
            Andariel, et comparez cet enchaînement aux routes classiques.
          </p>
        </section>
      )}

      <div className="character-grid">
        {customRoutes.map((r) => {
          const own = sessions.filter((s) => s.routeId === r.id);
          const time = own.reduce((sum, s) => sum + s.durationSeconds, 0);
          const best = aggregateSessions(own).sort(
            (a, b) => perHour(b.counts.unique, b.durationSeconds) - perHour(a.counts.unique, a.durationSeconds),
          )[0];
          const bestCharacter = best && characters.find((c) => c.id === best.characterId);
          return (
            <article key={r.id} className="panel character custom-route">
              <header>
                <span className="class-name">Route custom · {r.stops.length} étapes</span>
                <h3>{customRouteName(r)}</h3>
              </header>
              <ol className="stops-chain">
                {r.stops.map((id, i) => (
                  <li key={`${id}-${i}`}>
                    <span className="act">A{STOPS_BY_ID[id]?.act}</span> {STOPS_BY_ID[id]?.name ?? id}
                  </li>
                ))}
              </ol>
              <dl>
                <div>
                  <dt>Sessions</dt>
                  <dd>{own.length}</dd>
                </div>
                <div>
                  <dt>Temps de farm</dt>
                  <dd>{own.length ? formatDuration(time) : "—"}</dd>
                </div>
                <div>
                  <dt>Meilleur personnage</dt>
                  <dd>
                    {best && bestCharacter
                      ? `${characterLabel(bestCharacter)} · ${formatRate(perHour(best.counts.unique, best.durationSeconds))} uniq./h`
                      : "—"}
                  </dd>
                </div>
              </dl>
              {confirmId === r.id ? (
                <div className="confirm">
                  <p>
                    Supprimer cette route
                    {own.length ? ` et ses ${own.length} session${own.length > 1 ? "s" : ""}` : ""} ?
                  </p>
                  <div className="actions">
                    <button className="secondary danger" onClick={() => onDelete(r.id)}>
                      Supprimer
                    </button>
                    <button className="secondary" onClick={() => setConfirmId(null)}>
                      Garder
                    </button>
                  </div>
                </div>
              ) : (
                <div className="actions">
                  <button className="primary" onClick={() => onPlay(r.id)}>
                    Farmer cette route
                  </button>
                  <button className="secondary" onClick={() => setEditing(r)}>
                    Modifier
                  </button>
                  <button className="link" onClick={() => setConfirmId(r.id)}>
                    Supprimer
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>

      <section className="panel">
        <h2>Routes classiques</h2>
        <p className="hint">Toujours disponibles dans l'onglet Session : {ROUTES.map((r) => r.name).join(", ")}.</p>
      </section>
    </div>
  );
}

function RouteForm({
  initial,
  isNew,
  onSubmit,
  onCancel,
}: {
  initial: CustomRoute;
  isNew: boolean;
  onSubmit: (r: CustomRoute) => void;
  onCancel: () => void;
}) {
  const [r, setR] = useState(initial);
  const [toAdd, setToAdd] = useState(STOPS[0].id);
  const setStops = (stops: string[]) => setR((prev) => ({ ...prev, stops }));

  return (
    <form
      className="panel"
      onSubmit={(e) => {
        e.preventDefault();
        if (r.stops.length) onSubmit({ ...r, name: r.name.trim() });
      }}
    >
      <h2>{isNew ? "Nouvelle route custom" : "Modifier la route"}</h2>

      <label>
        Étapes, dans l'ordre de la partie
        <div className="add-stop">
          <select id="stop-select" value={toAdd} onChange={(e) => setToAdd(e.target.value)}>
            {ACTS.map((act) => (
              <optgroup key={act} label={`Acte ${act}`}>
                {STOPS.filter((s) => s.act === act && s.id !== "terror_zone").map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </optgroup>
            ))}
            <optgroup label="Autre">
              <option value="terror_zone">Terror Zone</option>
            </optgroup>
          </select>
          <button type="button" className="secondary" onClick={() => setStops([...r.stops, toAdd])}>
            Ajouter l'étape
          </button>
        </div>
      </label>

      {r.stops.length === 0 ? (
        <p className="hint">Ajoutez au moins une étape.</p>
      ) : (
        <ol className="stops-editor">
          {r.stops.map((id, i) => (
            <li key={`${id}-${i}`}>
              <span className="step-num">{i + 1}</span>
              <span className="step-name">
                {STOPS_BY_ID[id]?.name ?? id} <small className="hint">Acte {STOPS_BY_ID[id]?.act}</small>
              </span>
              <button type="button" className="icon" aria-label="Monter" disabled={i === 0} onClick={() => setStops(moveStop(r.stops, i, -1))}>
                ↑
              </button>
              <button
                type="button"
                className="icon"
                aria-label="Descendre"
                disabled={i === r.stops.length - 1}
                onClick={() => setStops(moveStop(r.stops, i, 1))}
              >
                ↓
              </button>
              <button type="button" className="icon" aria-label="Retirer" onClick={() => setStops(r.stops.filter((_, j) => j !== i))}>
                ✕
              </button>
            </li>
          ))}
        </ol>
      )}

      <label>
        Nom (facultatif)
        <input
          id="route-name"
          value={r.name}
          maxLength={40}
          onChange={(e) => setR((prev) => ({ ...prev, name: e.target.value }))}
          placeholder={stopsLabel(r.stops) || "ex. Tour MF du soir"}
        />
      </label>

      <div className="actions">
        <button type="submit" className="primary" disabled={r.stops.length === 0}>
          {isNew ? "Créer la route" : "Enregistrer"}
        </button>
        <button type="button" className="secondary" onClick={onCancel}>
          Annuler
        </button>
      </div>
      <p className="hint">Un run = une partie complète : cliquez « +1 run » une seule fois, après la dernière étape.</p>
    </form>
  );
}

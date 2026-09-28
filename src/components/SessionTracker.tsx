import { useEffect, useState } from "react";
import { BUILDS, BUILDS_BY_ID } from "../data/builds";
import { ITEMS, ITEMS_BY_ID } from "../data/items";
import { ROUTES, ROUTES_BY_ID } from "../data/routes";
import { estimateRoute, type PriceTable, type RunSettings } from "../lib/profitability";
import { usePersistentState } from "../lib/storage";
import { formatDuration, formatIst } from "../format";
import type { RunTimeOverrides } from "../App";

export interface LoggedDrop {
  name: string;
  value: number;
}

export interface SavedSession {
  id: string;
  date: string;
  buildId: string;
  routeId: string;
  durationSeconds: number;
  runs: number;
  drops: LoggedDrop[];
}

interface ActiveSession {
  routeId: string;
  startedAt: number;
  pausedAt: number | null;
  pausedTotalMs: number;
  runs: number;
  drops: LoggedDrop[];
}

interface Props {
  buildId: string;
  settings: RunSettings;
  prices: PriceTable;
  overrides: RunTimeOverrides;
  sessions: SavedSession[];
  onSessionsChange: (sessions: SavedSession[]) => void;
  onUseRunTime: (buildId: string, routeId: string, seconds: number) => void;
}

const CUSTOM = "__custom";

export default function SessionTracker(props: Props) {
  const { buildId, settings, prices, sessions } = props;
  const build = BUILDS_BY_ID[buildId] ?? BUILDS[0];
  const [active, setActive] = usePersistentState<ActiveSession | null>("active-session", null);
  const [routeId, setRouteId] = useState(ROUTES[0].id);
  const [now, setNow] = useState(() => Date.now());
  const [dropItem, setDropItem] = useState(ITEMS[0].id);
  const [customName, setCustomName] = useState("");
  const [customValue, setCustomValue] = useState("");

  useEffect(() => {
    if (!active || active.pausedAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);

  const priceOf = (id: string) => prices[id] ?? ITEMS_BY_ID[id]?.defaultValue ?? 0;

  if (!active) {
    return (
      <div className="grid">
        <section className="panel">
          <h2>Nouvelle session</h2>
          <p className="hint">
            Chronométrez une vraie session de farm avec <strong>{build.name}</strong> pour mesurer votre rentabilité
            réelle.
          </p>
          <label>
            Route
            <select value={routeId} onChange={(e) => setRouteId(e.target.value)}>
              {ROUTES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <button
            className="primary"
            onClick={() =>
              setActive({ routeId, startedAt: Date.now(), pausedAt: null, pausedTotalMs: 0, runs: 0, drops: [] })
            }
          >
            Démarrer le chrono
          </button>
        </section>
        <History {...props} />
      </div>
    );
  }

  const elapsedMs = (active.pausedAt ?? now) - active.startedAt - active.pausedTotalMs;
  const elapsed = Math.max(0, elapsedMs / 1000);
  const total = active.drops.reduce((s, d) => s + d.value, 0);
  const route = ROUTES_BY_ID[active.routeId];
  const estimate = estimateRoute(build, route, settings, ITEMS_BY_ID, prices, props.overrides[`${build.id}:${route.id}`]);

  const patch = (p: Partial<ActiveSession>) => setActive({ ...active, ...p });
  const togglePause = () => {
    const t = Date.now();
    setNow(t);
    if (active.pausedAt) patch({ pausedAt: null, pausedTotalMs: active.pausedTotalMs + (t - active.pausedAt) });
    else patch({ pausedAt: t });
  };
  const addDrop = () => {
    const drop =
      dropItem === CUSTOM
        ? { name: customName.trim() || "Objet", value: Number(customValue) || 0 }
        : { name: ITEMS_BY_ID[dropItem].name, value: priceOf(dropItem) };
    patch({ drops: [...active.drops, drop] });
    setCustomName("");
    setCustomValue("");
  };
  const finish = () => {
    if (active.runs > 0) {
      props.onSessionsChange([
        {
          id: String(Date.now()),
          date: new Date(active.startedAt).toISOString(),
          buildId: build.id,
          routeId: active.routeId,
          durationSeconds: Math.round(elapsed),
          runs: active.runs,
          drops: active.drops,
        },
        ...sessions,
      ]);
    }
    setActive(null);
  };

  return (
    <div className="grid">
      <section className="panel">
        <h2>
          Session en cours <small>{route.name}</small>
        </h2>
        <div className="stats">
          <Stat label="Temps" value={formatDuration(elapsed)} />
          <Stat label="Runs" value={String(active.runs)} />
          <Stat label="Moy./run" value={active.runs ? formatDuration(elapsed / active.runs) : "—"} />
          <Stat label="Butin" value={`${formatIst(total)} Ist`} />
          <Stat label="Ist/h réel" value={elapsed > 60 ? formatIst((total / elapsed) * 3600) : "—"} />
          <Stat label="Ist/h estimé" value={formatIst(estimate.valuePerHour)} />
        </div>
        <div className="actions">
          <button className="primary big" onClick={() => patch({ runs: active.runs + 1 })} disabled={!!active.pausedAt}>
            +1 run
          </button>
          <button className="secondary" onClick={() => patch({ runs: Math.max(0, active.runs - 1) })}>
            −1
          </button>
          <button className="secondary" onClick={togglePause}>
            {active.pausedAt ? "Reprendre" : "Pause"}
          </button>
          <button className="secondary" onClick={finish}>
            {active.runs > 0 ? "Terminer et enregistrer" : "Annuler"}
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>Ajouter un objet trouvé</h2>
        <label>
          Objet
          <select value={dropItem} onChange={(e) => setDropItem(e.target.value)}>
            {ITEMS.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} ({formatIst(priceOf(i.id))} Ist)
              </option>
            ))}
            <option value={CUSTOM}>Autre objet…</option>
          </select>
        </label>
        {dropItem === CUSTOM && (
          <div className="row">
            <label>
              Nom
              <input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="ex. Occulus" />
            </label>
            <label>
              Valeur (Ist)
              <input type="number" min={0} step={0.05} value={customValue} onChange={(e) => setCustomValue(e.target.value)} />
            </label>
          </div>
        )}
        <button className="primary" onClick={addDrop}>
          Ajouter
        </button>
        {active.drops.length > 0 && (
          <ul className="drops">
            {active.drops.map((d, i) => (
              <li key={i}>
                <span>{d.name}</span>
                <span>
                  {formatIst(d.value)} Ist
                  <button
                    className="link"
                    aria-label={`Retirer ${d.name}`}
                    onClick={() => patch({ drops: active.drops.filter((_, j) => j !== i) })}
                  >
                    ✕
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function History({ sessions, onSessionsChange, onUseRunTime, settings }: Props) {
  if (sessions.length === 0) {
    return (
      <section className="panel">
        <h2>Historique</h2>
        <p className="hint">Aucune session enregistrée pour l'instant.</p>
      </section>
    );
  }
  return (
    <section className="panel">
      <h2>Historique</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Build / route</th>
              <th className="num">Runs</th>
              <th className="num">Moy./run</th>
              <th className="num">Ist/h</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => {
              const total = s.drops.reduce((sum, d) => sum + d.value, 0);
              const avg = s.durationSeconds / s.runs;
              const runOnly = Math.max(1, Math.round(avg - settings.gameOverheadSeconds));
              return (
                <tr key={s.id}>
                  <td>{new Date(s.date).toLocaleDateString("fr-FR")}</td>
                  <td>
                    {BUILDS_BY_ID[s.buildId]?.name ?? s.buildId}
                    <br />
                    <small>{ROUTES_BY_ID[s.routeId]?.name ?? s.routeId}</small>
                  </td>
                  <td className="num">{s.runs}</td>
                  <td className="num">{formatDuration(avg)}</td>
                  <td className="num strong">{formatIst(s.durationSeconds ? (total / s.durationSeconds) * 3600 : 0)}</td>
                  <td className="num">
                    <button
                      className="link"
                      title="Utiliser ce temps (hors création de partie) dans le simulateur"
                      onClick={() => onUseRunTime(s.buildId, s.routeId, runOnly)}
                    >
                      utiliser {runOnly}s
                    </button>
                    <button
                      className="link"
                      aria-label="Supprimer la session"
                      onClick={() => onSessionsChange(sessions.filter((x) => x.id !== s.id))}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

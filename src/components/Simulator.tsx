import { useMemo } from "react";
import { BUILDS, BUILDS_BY_ID } from "../data/builds";
import { ITEMS_BY_ID } from "../data/items";
import { ROUTES } from "../data/routes";
import { estimateRoute, type PriceTable, type RouteEstimate, type RunSettings } from "../lib/profitability";
import { formatDuration, formatIst, formatPercent } from "../format";
import type { RunTimeOverrides } from "../App";

interface Props {
  buildId: string;
  onBuildChange: (id: string) => void;
  settings: RunSettings;
  onSettingsChange: (s: RunSettings) => void;
  prices: PriceTable;
  overrides: RunTimeOverrides;
  onOverrideChange: (routeId: string, seconds: number | null) => void;
  selectedRoute: string | null;
  onSelectRoute: (id: string | null) => void;
}

export default function Simulator(props: Props) {
  const { buildId, settings, prices, overrides, selectedRoute } = props;
  const build = BUILDS_BY_ID[buildId] ?? BUILDS[0];

  const estimates = useMemo(
    () =>
      ROUTES.map((route) =>
        estimateRoute(build, route, settings, ITEMS_BY_ID, prices, overrides[`${build.id}:${route.id}`]),
      ).sort((a, b) => b.valuePerHour - a.valuePerHour),
    [build, settings, prices, overrides],
  );
  const best = estimates[0]?.valuePerHour || 1;
  const selected = estimates.find((e) => e.route.id === selectedRoute) ?? null;

  const update = (patch: Partial<RunSettings>) => props.onSettingsChange({ ...settings, ...patch });

  return (
    <div className="grid">
      <section className="panel controls">
        <h2>Votre personnage</h2>
        <label>
          Build
          <select value={build.id} onChange={(e) => props.onBuildChange(e.target.value)}>
            {BUILDS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} — {b.className}
              </option>
            ))}
          </select>
        </label>
        <p className="hint">{build.description}</p>

        <label>
          Magic Find : <strong>{settings.magicFind} %</strong>
          <input
            type="range"
            min={0}
            max={800}
            step={10}
            value={settings.magicFind}
            onChange={(e) => update({ magicFind: Number(e.target.value) })}
          />
        </label>

        <label>
          Paramètre /players : <strong>{settings.players}</strong>
          <input
            type="range"
            min={1}
            max={8}
            value={settings.players}
            onChange={(e) => update({ players: Number(e.target.value) })}
          />
        </label>

        <label>
          Création de partie (s)
          <input
            type="number"
            min={0}
            max={120}
            value={settings.gameOverheadSeconds}
            onChange={(e) => update({ gameOverheadSeconds: Number(e.target.value) || 0 })}
          />
        </label>

        {!build.hasTeleport && (
          <label className="checkbox">
            <input type="checkbox" checked={settings.enigma} onChange={(e) => update({ enigma: e.target.checked })} />
            Je porte Enigma (téléportation)
          </label>
        )}
      </section>

      <section className="panel results">
        <h2>Classement des routes</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Route</th>
                <th className="num">Durée</th>
                <th className="num">Runs/h</th>
                <th className="num">Ist/run</th>
                <th className="num">Ist/h</th>
              </tr>
            </thead>
            <tbody>
              {estimates.map((e) => (
                <tr
                  key={e.route.id}
                  className={e.route.id === selectedRoute ? "selected" : undefined}
                  onClick={() => props.onSelectRoute(e.route.id === selectedRoute ? null : e.route.id)}
                >
                  <td>
                    <div className="route-name">
                      {e.route.name}
                      {overrides[`${build.id}:${e.route.id}`] && <span className="badge">perso</span>}
                      {e.immuneFraction >= 0.2 && <span className="badge warn">immunités</span>}
                    </div>
                    <div className="bar">
                      <span style={{ width: `${Math.max(2, (e.valuePerHour / best) * 100)}%` }} />
                    </div>
                  </td>
                  <td className="num">{formatDuration(e.runSeconds)}</td>
                  <td className="num">{e.runsPerHour.toFixed(1)}</td>
                  <td className="num">{formatIst(e.valuePerRun)}</td>
                  <td className="num strong">{formatIst(e.valuePerHour)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="hint">Cliquez sur une route pour le détail et saisir votre propre temps de run.</p>
      </section>

      {selected && (
        <RouteDetail
          estimate={selected}
          override={overrides[`${build.id}:${selected.route.id}`]}
          onOverrideChange={(s) => props.onOverrideChange(selected.route.id, s)}
        />
      )}
    </div>
  );
}

function RouteDetail({
  estimate,
  override,
  onOverrideChange,
}: {
  estimate: RouteEstimate;
  override?: number;
  onOverrideChange: (seconds: number | null) => void;
}) {
  const { route } = estimate;
  const drops = [...estimate.drops].sort((a, b) => b.value - a.value);
  return (
    <section className="panel detail">
      <h2>
        {route.name} <small>Acte {route.act} · zone niv. {route.areaLevel}</small>
      </h2>
      <p>{route.notes}</p>
      <ul className="facts">
        <li>Monstres bloquants pour ce build : {formatPercent(estimate.immuneFraction)}</li>
        <li>Téléportation : {estimate.teleport ? "oui" : "non (trajets plus longs)"}</li>
      </ul>

      <label className="inline">
        Mon temps de run (s)
        <input
          type="number"
          min={0}
          placeholder={String(Math.round(estimate.runSeconds))}
          value={override ?? ""}
          onChange={(e) => onOverrideChange(Number(e.target.value) || null)}
        />
        {override && (
          <button className="link" onClick={() => onOverrideChange(null)}>
            revenir à l'estimation
          </button>
        )}
      </label>

      <h3>Contribution par objet</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Objet</th>
              <th className="num">Chance / run</th>
              <th className="num">Ist / run</th>
            </tr>
          </thead>
          <tbody>
            {drops.map((d) => (
              <tr key={d.item.id}>
                <td>
                  <span className={`q-${d.item.quality}`}>{d.item.name}</span>
                </td>
                <td className="num">{d.perRun >= 0.01 ? formatPercent(d.perRun) : `1 / ${Math.round(1 / d.perRun)}`}</td>
                <td className="num">{formatIst(d.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

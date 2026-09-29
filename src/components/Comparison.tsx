import { useMemo, useState } from "react";
import { BUILDS_BY_ID } from "../data/builds";
import { DROP_CATEGORIES, RUNE_KINDS, type DropKind } from "../data/drops";
import { ROUTES_BY_ID } from "../data/routes";
import {
  aggregateSessions,
  perHour,
  perHourMargin,
  reliability,
  runeTotal,
  type Counts,
  type Reliability,
  type SavedSession,
} from "../lib/stats";
import { formatDuration, formatRate } from "../format";

type SortKey = DropKind | "runes" | "uniques_sets";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "unique", label: "Uniques / h" },
  { key: "set", label: "Sets / h" },
  { key: "uniques_sets", label: "Uniques + sets / h" },
  { key: "runes", label: "Runes / h (toutes)" },
  ...RUNE_KINDS.map((k) => ({ key: k, label: `${DROP_CATEGORIES.find((c) => c.kind === k)!.label} / h` })),
];

const RELIABILITY: Record<Reliability, { label: string; title: string }> = {
  good: { label: "fiable", title: "30 uniques + sets ou plus" },
  medium: { label: "indicatif", title: "10 à 29 uniques + sets : tendance à confirmer" },
  low: { label: "trop peu", title: "Moins de 10 uniques + sets : le hasard domine" },
};

function metric(counts: Counts, key: SortKey): number {
  if (key === "runes") return runeTotal(counts);
  if (key === "uniques_sets") return counts.unique + counts.set;
  return counts[key];
}

interface Props {
  sessions: SavedSession[];
  onDelete: (id: string) => void;
}

export default function Comparison({ sessions, onDelete }: Props) {
  const [buildFilter, setBuildFilter] = useState("all");
  const [sort, setSort] = useState<SortKey>("unique");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const buildIds = useMemo(() => [...new Set(sessions.map((s) => s.buildId))], [sessions]);
  const filtered = buildFilter === "all" ? sessions : sessions.filter((s) => s.buildId === buildFilter);
  const rows = useMemo(
    () =>
      aggregateSessions(filtered).sort(
        (a, b) => perHour(metric(b.counts, sort), b.durationSeconds) - perHour(metric(a.counts, sort), a.durationSeconds),
      ),
    [filtered, sort],
  );

  if (sessions.length === 0) {
    return (
      <section className="panel empty">
        <h2>Aucune session pour l'instant</h2>
        <p className="hint">
          Lancez une session dans l'onglet <strong>Session</strong>, farmez une route puis cliquez « Terminer et
          enregistrer ». Vos routes apparaîtront ici, classées par drops par heure.
        </p>
      </section>
    );
  }

  const best = rows[0] ? perHour(metric(rows[0].counts, sort), rows[0].durationSeconds) || 1 : 1;

  return (
    <div className="stack">
      <section className="panel">
        <div className="toolbar">
          <h2>Classement de vos routes</h2>
          <label>
            Personnage
            <select value={buildFilter} onChange={(e) => setBuildFilter(e.target.value)}>
              <option value="all">Tous</option>
              {buildIds.map((id) => (
                <option key={id} value={id}>
                  {BUILDS_BY_ID[id]?.name ?? id}
                </option>
              ))}
            </select>
          </label>
          <label>
            Trier par
            <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="table-wrap">
          <table className="compare">
            <thead>
              <tr>
                <th>Route</th>
                <th className="num">Temps</th>
                <th className="num">Runs</th>
                <th className="num">Moy.</th>
                <th className="num q-unique">Uniq./h</th>
                <th className="num q-set">Sets/h</th>
                {RUNE_KINDS.map((k) => (
                  <th key={k} className="num q-rune">
                    {DROP_CATEGORIES.find((c) => c.kind === k)!.short}/h
                  </th>
                ))}
                <th>Fiabilité</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((g) => {
                const rel = reliability(g.counts);
                const value = perHour(metric(g.counts, sort), g.durationSeconds);
                return (
                  <tr key={g.key}>
                    <td>
                      <div className="route-name">{ROUTES_BY_ID[g.routeId]?.name ?? g.routeId}</div>
                      <small className="hint">
                        {BUILDS_BY_ID[g.buildId]?.name ?? g.buildId} ·{" "}
                        {g.mfMin === g.mfMax ? `${g.mfMin} %` : `${g.mfMin}–${g.mfMax} %`} MF
                      </small>
                      <div className="bar">
                        <span style={{ width: `${Math.max(2, (value / best) * 100)}%` }} />
                      </div>
                    </td>
                    <td className="num">{formatDuration(g.durationSeconds)}</td>
                    <td className="num">{g.runs}</td>
                    <td className="num">{formatDuration(g.durationSeconds / g.runs)}</td>
                    <td className="num strong" title={`${g.counts.unique} uniques · ± ${formatRate(perHourMargin(g.counts.unique, g.durationSeconds))} /h`}>
                      {formatRate(perHour(g.counts.unique, g.durationSeconds))}
                    </td>
                    <td className="num strong" title={`${g.counts.set} sets · ± ${formatRate(perHourMargin(g.counts.set, g.durationSeconds))} /h`}>
                      {formatRate(perHour(g.counts.set, g.durationSeconds))}
                    </td>
                    {RUNE_KINDS.map((k) => (
                      <td key={k} className="num" title={`${g.counts[k]} au total`}>
                        {formatRate(perHour(g.counts[k], g.durationSeconds))}
                      </td>
                    ))}
                    <td>
                      <span className={`pill r-${rel}`} title={RELIABILITY[rel].title}>
                        {RELIABILITY[rel].label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="hint">
          Survolez un taux pour voir le total et sa marge d'erreur. Une route n'est « fiable » qu'à partir de 30 uniques
          + sets observés.
        </p>
      </section>

      <section className="panel">
        <h2>Sessions enregistrées</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Route</th>
                <th className="num">MF</th>
                <th className="num">Durée</th>
                <th className="num">Runs</th>
                <th className="num q-unique">Uniq.</th>
                <th className="num q-set">Sets</th>
                <th className="num q-rune">Runes</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td>
                    {new Date(s.date).toLocaleDateString("fr-FR")}
                    <br />
                    <small className="hint">{BUILDS_BY_ID[s.buildId]?.name ?? s.buildId}</small>
                  </td>
                  <td>{ROUTES_BY_ID[s.routeId]?.name ?? s.routeId}</td>
                  <td className="num">{s.magicFind}</td>
                  <td className="num">{formatDuration(s.durationSeconds)}</td>
                  <td className="num">{s.runs}</td>
                  <td className="num">{s.counts.unique}</td>
                  <td className="num">{s.counts.set}</td>
                  <td className="num">{runeTotal(s.counts)}</td>
                  <td className="num">
                    {confirmId === s.id ? (
                      <>
                        <button className="link danger" onClick={() => onDelete(s.id)}>
                          supprimer
                        </button>
                        <button className="link" onClick={() => setConfirmId(null)}>
                          garder
                        </button>
                      </>
                    ) : (
                      <button className="link" aria-label="Supprimer la session" onClick={() => setConfirmId(s.id)}>
                        ✕
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

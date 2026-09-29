import { useMemo, useState } from "react";
import { CLASSES_BY_ID } from "../data/classes";
import { DROP_CATEGORIES, RUNE_KINDS } from "../data/drops";
import { ROUTES_BY_ID } from "../data/routes";
import { characterLabel, type Character } from "../lib/characters";
import {
  aggregateSessions,
  metricCount,
  perHour,
  perHourMargin,
  reliability,
  runeTotal,
  type Metric,
  type Reliability,
  type RouteAggregate,
  type SavedSession,
} from "../lib/stats";
import { buildVerdict, METRICS, type Contender } from "../lib/verdict";
import { formatDuration, formatRate } from "../format";

const RELIABILITY: Record<Reliability, { label: string; title: string }> = {
  good: { label: "fiable", title: "30 uniques + sets ou plus" },
  medium: { label: "indicatif", title: "10 à 29 uniques + sets : tendance à confirmer" },
  low: { label: "trop peu", title: "Moins de 10 uniques + sets : le hasard domine" },
};

interface Props {
  characters: Character[];
  sessions: SavedSession[];
  onDelete: (id: string) => void;
}

export default function Comparison({ characters, sessions, onDelete }: Props) {
  const [characterFilter, setCharacterFilter] = useState("all");
  const [metric, setMetric] = useState<Metric>("unique");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const byId = useMemo(() => Object.fromEntries(characters.map((c) => [c.id, c])), [characters]);
  const known = sessions.filter((s) => byId[s.characterId]);
  const filtered = characterFilter === "all" ? known : known.filter((s) => s.characterId === characterFilter);
  const rate = (g: RouteAggregate) => perHour(metricCount(g.counts, metric), g.durationSeconds);
  const rows = aggregateSessions(filtered).sort((a, b) => rate(b) - rate(a));
  const contenders: Contender[] = rows.map((g) => ({ character: byId[g.characterId], route: ROUTES_BY_ID[g.routeId], aggregate: g }));

  if (known.length === 0) {
    return (
      <section className="panel empty">
        <h2>Aucune session pour l'instant</h2>
        <p className="hint">
          Lancez une session dans l'onglet <strong>Session</strong>, farmez une route puis cliquez « Terminer et
          enregistrer ». Vos combinaisons personnage + route apparaîtront ici.
        </p>
      </section>
    );
  }

  const best = rows[0] ? rate(rows[0]) || 1 : 1;

  return (
    <div className="stack">
      <section className="panel">
        <div className="toolbar">
          <h2>Classement</h2>
          <label>
            Personnage
            <select id="cmp-character" value={characterFilter} onChange={(e) => setCharacterFilter(e.target.value)}>
              <option value="all">Tous mes personnages</option>
              {characters.map((c) => (
                <option key={c.id} value={c.id}>
                  {characterLabel(c)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Critère
            <select id="cmp-metric" value={metric} onChange={(e) => setMetric(e.target.value as Metric)}>
              {METRICS.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {contenders.length >= 2 && <VerdictPanel contenders={contenders} metric={metric} />}

        <div className="table-wrap">
          <table className="compare">
            <thead>
              <tr>
                <th>Personnage · route</th>
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
                const c = byId[g.characterId];
                return (
                  <tr key={g.key}>
                    <td>
                      <div className="route-name">{ROUTES_BY_ID[g.routeId]?.name ?? g.routeId}</div>
                      <small className={`who c-${c.classId}`}>
                        {characterLabel(c)} · {g.mfMin === g.mfMax ? `${g.mfMin} %` : `${g.mfMin}–${g.mfMax} %`} MF
                      </small>
                      <div className="bar">
                        <span style={{ width: `${Math.max(2, (rate(g) / best) * 100)}%` }} />
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
          Survolez un taux pour voir le total et sa marge d'erreur. Une ligne n'est « fiable » qu'à partir de 30 uniques
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
                    <small className="hint">{characterLabel(byId[s.characterId])}</small>
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

/** Verdict en toutes lettres : le n°1 contre le meilleur autre personnage, ou un duel choisi. */
function VerdictPanel({ contenders, metric }: { contenders: Contender[]; metric: Metric }) {
  const [pick, setPick] = useState<{ a: string; b: string } | null>(null);
  const keys = contenders.map((c) => c.aggregate.key);
  const aKey = pick && keys.includes(pick.a) ? pick.a : keys[0];
  // Par défaut : le n°1 contre le meilleur résultat d'un autre personnage (sinon le n°2).
  const aCharacter = contenders.find((c) => c.aggregate.key === aKey)!.character.id;
  const defaultB =
    contenders.find((c) => c.aggregate.key !== aKey && c.character.id !== aCharacter)?.aggregate.key ??
    keys.find((k) => k !== aKey)!;
  const bKey = pick && keys.includes(pick.b) && pick.b !== aKey ? pick.b : defaultB;
  const x = contenders.find((c) => c.aggregate.key === aKey)!;
  const y = contenders.find((c) => c.aggregate.key === bKey)!;
  const rateOf = (c: Contender) => perHour(metricCount(c.aggregate.counts, metric), c.aggregate.durationSeconds);
  const [winner, loser] = rateOf(x) >= rateOf(y) ? [x, y] : [y, x];
  const verdict = buildVerdict(winner, loser, metric);
  const option = (c: Contender) => (
    <option key={c.aggregate.key} value={c.aggregate.key}>
      {characterLabel(c.character)} · {c.route.name}
    </option>
  );

  return (
    <div className={`verdict c-${winner.character.classId}`}>
      <span className="verdict-kicker">Verdict · {CLASSES_BY_ID[winner.character.classId].name}</span>
      <p className="verdict-headline">{verdict.headline}</p>
      <p className="verdict-figures">
        {verdict.figures}{" "}
        <span className={verdict.significant ? "pill r-good" : "pill r-medium"}>
          {verdict.significant ? "écart significatif" : "pas encore significatif"}
        </span>
      </p>
      {!verdict.significant && (
        <p className="hint">L'écart peut encore venir du hasard : continuez à farmer ces deux combinaisons pour confirmer.</p>
      )}
      <div className="duel">
        <label>
          Comparer
          <select id="duel-a" value={aKey} onChange={(e) => setPick({ a: e.target.value, b: bKey })}>
            {contenders.map(option)}
          </select>
        </label>
        <span className="vs">contre</span>
        <label>
          <span aria-hidden="true">&nbsp;</span>
          <select id="duel-b" value={bKey} onChange={(e) => setPick({ a: aKey, b: e.target.value })}>
            {contenders.filter((c) => c.aggregate.key !== aKey).map(option)}
          </select>
        </label>
      </div>
    </div>
  );
}

import { DROP_CATEGORIES, RUNE_KINDS } from "../data/drops";
import type { Route } from "../data/routes";
import { characterWithPossessive, type Character } from "./characters";
import { compareRates, metricCount, type Metric, type RouteAggregate } from "./stats";

export const METRICS: { key: Metric; label: string; unit: string }[] = [
  { key: "unique", label: "Uniques / h", unit: "uniques/h" },
  { key: "set", label: "Sets / h", unit: "sets/h" },
  { key: "uniques_sets", label: "Uniques + sets / h", unit: "uniques + sets/h" },
  { key: "runes", label: "Runes / h (toutes)", unit: "runes/h" },
  ...RUNE_KINDS.map((k) => {
    const label = DROP_CATEGORIES.find((c) => c.kind === k)!.label;
    return { key: k as Metric, label: `${label} / h`, unit: `${label}s/h` };
  }),
];

export const METRIC_BY_KEY = Object.fromEntries(METRICS.map((m) => [m.key, m])) as Record<Metric, (typeof METRICS)[number]>;

export interface Contender {
  character: Character;
  route: Route;
  aggregate: RouteAggregate;
}

export interface Verdict {
  headline: string;
  figures: string;
  significant: boolean;
  /** A et B ont exactement le même taux. */
  tie: boolean;
}

const fr = (n: number) => (n >= 100 ? String(Math.round(n)) : n.toFixed(1).replace(".", ","));
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Phrase comparant deux couples personnage + route sur un critère.
 * A doit être le meilleur des deux (ou égal).
 */
export function buildVerdict(a: Contender, b: Contender, metric: Metric): Verdict {
  const cmp = compareRates(
    metricCount(a.aggregate.counts, metric),
    a.aggregate.durationSeconds,
    metricCount(b.aggregate.counts, metric),
    b.aggregate.durationSeconds,
  );
  const tie = cmp.rateA === cmp.rateB;
  const sameCharacter = a.character.id === b.character.id;
  const sameRoute = a.route.id === b.route.id;

  let headline: string;
  if (sameRoute && !sameCharacter) {
    headline = `Pour ${a.route.phrase}, ${characterWithPossessive(a.character)} est ${tie ? "aussi efficace que" : "plus efficace que"} ${characterWithPossessive(b.character)}.`;
  } else {
    const verb = a.route.plural ? (tie ? "sont aussi efficaces que" : "sont plus efficaces que") : tie ? "est aussi efficace que" : "est plus efficace que";
    const tail = sameCharacter ? "" : ` avec ${characterWithPossessive(b.character)}`;
    headline = `Avec ${characterWithPossessive(a.character)}, ${a.route.phrase} ${verb} ${b.route.phrase}${tail}.`;
  }

  const unit = METRIC_BY_KEY[metric].unit;
  const pct = Number.isFinite(cmp.relative) ? ` (+${Math.round(cmp.relative * 100)} %)` : "";
  return {
    headline: capitalize(headline),
    figures: `${fr(cmp.rateA)} ${unit} contre ${fr(cmp.rateB)}${tie ? "" : pct}.`,
    significant: cmp.significant,
    tie,
  };
}

import { useCallback, useEffect, useState } from "react";
import { characterLabel, type Character } from "../lib/characters";
import { DROP_CATEGORIES, RUNE_KINDS, CATEGORY_BY_KIND } from "../data/drops";
import { ROUTES, ROUTES_BY_ID } from "../data/routes";
import { usePersistentState } from "../lib/storage";
import {
  perHour,
  runeTotal,
  summarizeEvents,
  type EventType,
  type SavedSession,
  type SessionEvent,
  type SessionSetup,
} from "../lib/stats";
import { formatDuration, formatRate } from "../format";

interface ActiveSession extends SessionSetup {
  startedAt: number;
  pausedAt: number | null;
  pausedTotalMs: number;
  events: SessionEvent[];
}

interface Props {
  characters: Character[];
  setup: SessionSetup;
  onSetupChange: (setup: SessionSetup) => void;
  onSave: (session: SavedSession) => void;
  /** La MF saisie au démarrage diffère de celle du personnage : on la met à jour. */
  onCharacterMagicFind: (characterId: string, magicFind: number) => void;
  onCreateCharacter: () => void;
}

const EVENT_LABEL: Record<EventType, string> = {
  run: "Run",
  ...(Object.fromEntries(DROP_CATEGORIES.map((c) => [c.kind, c.label])) as Record<Exclude<EventType, "run">, string>),
};

export default function SessionTracker({ characters, setup, onSetupChange, onSave, onCharacterMagicFind, onCreateCharacter }: Props) {
  const [active, setActive] = usePersistentState<ActiveSession | null>("v3:active-session", null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active || active.pausedAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);

  const add = useCallback(
    (type: EventType) => setActive((a) => (a ? { ...a, events: [...a.events, { type, at: Date.now() }] } : a)),
    [setActive],
  );
  const undo = useCallback(
    () => setActive((a) => (a && a.events.length ? { ...a, events: a.events.slice(0, -1) } : a)),
    [setActive],
  );
  const togglePause = useCallback(() => {
    const t = Date.now();
    setNow(t);
    setActive((a) => {
      if (!a) return a;
      return a.pausedAt
        ? { ...a, pausedAt: null, pausedTotalMs: a.pausedTotalMs + (t - a.pausedAt) }
        : { ...a, pausedAt: t };
    });
  }, [setActive]);

  // Raccourcis clavier : R = run, U = unique, S = set, 1-5 = runes, Z = annuler, P = pause.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || (e.target as HTMLElement).closest("input, select, textarea")) return;
      const key = e.key.toLowerCase();
      if (key === "r") add("run");
      else if (key === "z") undo();
      else if (key === "p") togglePause();
      else {
        const cat = DROP_CATEGORIES.find((c) => c.key === key);
        if (!cat) return;
        add(cat.kind);
      }
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, add, undo, togglePause]);

  if (!active) {
    if (characters.length === 0) {
      return (
        <section className="panel empty">
          <h2>Créez d'abord un personnage</h2>
          <p className="hint">Chaque session est rattachée à un de vos personnages : classe, spécialisation et Magic Find.</p>
          <button className="primary big" onClick={onCreateCharacter}>
            Créer un personnage
          </button>
        </section>
      );
    }
    // Personnage sélectionné encore existant, sinon le premier.
    const current = characters.find((c) => c.id === setup.characterId) ?? characters[0];
    const effective = current.id === setup.characterId ? setup : { ...setup, characterId: current.id, magicFind: current.magicFind };
    return (
      <SetupForm
        characters={characters}
        setup={effective}
        onChange={onSetupChange}
        onStart={() => {
          if (effective.magicFind !== current.magicFind) onCharacterMagicFind(current.id, effective.magicFind);
          setActive({ ...effective, startedAt: Date.now(), pausedAt: null, pausedTotalMs: 0, events: [] });
        }}
      />
    );
  }
  const character = characters.find((c) => c.id === active.characterId);

  const elapsed = Math.max(0, ((active.pausedAt ?? now) - active.startedAt - active.pausedTotalMs) / 1000);
  const { runs, counts } = summarizeEvents(active.events);
  const last = active.events[active.events.length - 1];
  // Sous 2 minutes, un taux horaire n'a pas de sens (1 unique en 10 s = 360/h).
  const rate = (count: number) => (elapsed >= 120 ? formatRate(perHour(count, elapsed)) : "—");

  const finish = () => {
    if (runs > 0) {
      onSave({
        id: String(Date.now()),
        date: new Date(active.startedAt).toISOString(),
        characterId: active.characterId,
        routeId: active.routeId,
        magicFind: active.magicFind,
        players: active.players,
        durationSeconds: Math.round(elapsed),
        runs,
        counts,
      });
    }
    setActive(null);
  };

  return (
    <div className="session">
      <section className="panel session-head">
        <div>
          <h2>{ROUTES_BY_ID[active.routeId]?.name ?? active.routeId}</h2>
          <p className="hint">
            {character ? characterLabel(character) : "Personnage supprimé"} · {active.magicFind} % MF · joueurs {active.players}
          </p>
        </div>
        <div className={active.pausedAt ? "timer paused" : "timer"} aria-live="off">
          {formatDuration(elapsed)}
          {active.pausedAt && <span>en pause</span>}
        </div>
      </section>

      <section className="stats" aria-label="Résultats en direct">
        <Stat label="Runs" value={String(runs)} />
        <Stat label="Moy. / run" value={runs ? formatDuration(elapsed / runs) : "—"} />
        <Stat label="Uniques / h" value={rate(counts.unique)} tone="unique" />
        <Stat label="Sets / h" value={rate(counts.set)} tone="set" />
        <Stat label="Runes / h" value={rate(runeTotal(counts))} tone="rune" />
      </section>

      <section className="panel">
        <button className="run-button" onClick={() => add("run")}>
          +1 run <kbd>R</kbd>
          <span>{runs}</span>
        </button>

        <div className="drop-grid two">
          {(["unique", "set"] as const).map((kind) => (
            <DropButton key={kind} kind={kind} count={counts[kind]} onClick={() => add(kind)} />
          ))}
        </div>
        <div className="drop-grid runes">
          {RUNE_KINDS.map((kind) => (
            <DropButton key={kind} kind={kind} count={counts[kind]} onClick={() => add(kind)} />
          ))}
        </div>

        <div className="actions">
          <button className="secondary" onClick={undo} disabled={!last}>
            Annuler {last ? `« ${EVENT_LABEL[last.type]} »` : ""} <kbd>Z</kbd>
          </button>
          <button className="secondary" onClick={togglePause}>
            {active.pausedAt ? "Reprendre" : "Pause"} <kbd>P</kbd>
          </button>
          <button className="secondary danger" onClick={finish}>
            {runs > 0 ? "Terminer et enregistrer" : "Abandonner"}
          </button>
        </div>
        <p className="hint">
          Cliquez « +1 run » à la fin de chaque partie. Comptez chaque objet doré (unique) ou vert (set) dès qu'il tombe,
          avant identification.
        </p>
      </section>
    </div>
  );
}

function DropButton({ kind, count, onClick }: { kind: keyof typeof CATEGORY_BY_KIND; count: number; onClick: () => void }) {
  const cat = CATEGORY_BY_KIND[kind];
  return (
    <button className={`drop-button k-${kind}`} onClick={onClick} title={cat.runes.join(", ") || undefined}>
      <span className="drop-label">
        {cat.label} <kbd>{cat.key.toUpperCase()}</kbd>
      </span>
      <span className="drop-count">{count}</span>
      {cat.runes.length > 0 && <span className="drop-runes">{cat.runes.join(" · ")}</span>}
    </button>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className={tone ? `stat t-${tone}` : "stat"}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SetupForm({
  characters,
  setup,
  onChange,
  onStart,
}: {
  characters: Character[];
  setup: SessionSetup;
  onChange: (s: SessionSetup) => void;
  onStart: () => void;
}) {
  const character = characters.find((c) => c.id === setup.characterId);
  const update = (patch: Partial<SessionSetup>) => onChange({ ...setup, ...patch });
  return (
    <section className="panel setup">
      <h2>Nouvelle session</h2>
      <div className="setup-grid">
        <label>
          Personnage
          <select
            id="setup-character"
            value={setup.characterId}
            onChange={(e) => {
              const next = characters.find((c) => c.id === e.target.value)!;
              update({ characterId: next.id, magicFind: next.magicFind });
            }}
          >
            {characters.map((c) => (
              <option key={c.id} value={c.id}>
                {characterLabel(c)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Route
          <select value={setup.routeId} onChange={(e) => update({ routeId: e.target.value })}>
            {ROUTES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Magic Find (%)
          <input
            type="number"
            min={0}
            max={1500}
            inputMode="numeric"
            value={setup.magicFind}
            onChange={(e) => update({ magicFind: Math.max(0, Number(e.target.value) || 0) })}
          />
        </label>
        <label>
          /players
          <select value={setup.players} onChange={(e) => update({ players: Number(e.target.value) })}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button className="primary big" onClick={onStart}>
        Démarrer le chrono
      </button>
      <p className="hint">
        La MF et /players sont enregistrés avec la session : ils influencent les uniques et les sets.
        {character && setup.magicFind !== character.magicFind && " La MF du personnage sera mise à jour au démarrage."}
      </p>
    </section>
  );
}

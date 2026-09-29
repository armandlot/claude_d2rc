import { useState } from "react";
import { CLASSES, CLASSES_BY_ID, type ClassId } from "../data/classes";
import { ROUTES_BY_ID } from "../data/routes";
import { characterLabel, newCharacterId, type Character } from "../lib/characters";
import { aggregateSessions, perHour, type SavedSession } from "../lib/stats";
import { formatDuration, formatRate } from "../format";

interface Props {
  characters: Character[];
  sessions: SavedSession[];
  onSave: (character: Character) => void;
  onDelete: (id: string) => void;
  onPlay: (id: string) => void;
}

const OTHER = "__other";

export default function Characters({ characters, sessions, onSave, onDelete, onPlay }: Props) {
  const [editing, setEditing] = useState<Character | null>(characters.length === 0 ? blank() : null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  return (
    <div className="stack">
      {editing ? (
        <CharacterForm
          key={editing.id}
          initial={editing}
          isNew={!characters.some((c) => c.id === editing.id)}
          onCancel={characters.length ? () => setEditing(null) : undefined}
          onSubmit={(c) => {
            onSave(c);
            setEditing(null);
          }}
        />
      ) : (
        <button className="primary add-character" onClick={() => setEditing(blank())}>
          + Nouveau personnage
        </button>
      )}

      <div className="character-grid">
        {characters.map((c) => {
          const own = sessions.filter((s) => s.characterId === c.id);
          const time = own.reduce((sum, s) => sum + s.durationSeconds, 0);
          const best = aggregateSessions(own).sort(
            (a, b) => perHour(b.counts.unique, b.durationSeconds) - perHour(a.counts.unique, a.durationSeconds),
          )[0];
          return (
            <article key={c.id} className={`panel character c-${c.classId}`}>
              <header>
                <span className="class-name">{CLASSES_BY_ID[c.classId].name}</span>
                <h3>{c.spec}</h3>
                {c.name && <span className="hint">« {c.name} »</span>}
              </header>
              <dl>
                <div>
                  <dt>Magic Find</dt>
                  <dd>{c.magicFind} %</dd>
                </div>
                <div>
                  <dt>Sessions</dt>
                  <dd>{own.length}</dd>
                </div>
                <div>
                  <dt>Temps de farm</dt>
                  <dd>{own.length ? formatDuration(time) : "—"}</dd>
                </div>
                <div>
                  <dt>Meilleure route</dt>
                  <dd>
                    {best
                      ? `${ROUTES_BY_ID[best.routeId]?.name ?? best.routeId} · ${formatRate(perHour(best.counts.unique, best.durationSeconds))} uniq./h`
                      : "—"}
                  </dd>
                </div>
              </dl>
              {confirmId === c.id ? (
                <div className="confirm">
                  <p>
                    Supprimer {characterLabel(c)}
                    {own.length ? ` et ses ${own.length} session${own.length > 1 ? "s" : ""}` : ""} ?
                  </p>
                  <div className="actions">
                    <button className="secondary danger" onClick={() => onDelete(c.id)}>
                      Supprimer
                    </button>
                    <button className="secondary" onClick={() => setConfirmId(null)}>
                      Garder
                    </button>
                  </div>
                </div>
              ) : (
                <div className="actions">
                  <button className="primary" onClick={() => onPlay(c.id)}>
                    Farmer avec
                  </button>
                  <button className="secondary" onClick={() => setEditing(c)}>
                    Modifier
                  </button>
                  <button className="link" aria-label={`Supprimer ${characterLabel(c)}`} onClick={() => setConfirmId(c.id)}>
                    Supprimer
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function blank(): Character {
  return { id: newCharacterId(), name: "", classId: "sorceress", spec: CLASSES_BY_ID.sorceress.specs[0], magicFind: 300 };
}

function CharacterForm({
  initial,
  isNew,
  onSubmit,
  onCancel,
}: {
  initial: Character;
  isNew: boolean;
  onSubmit: (c: Character) => void;
  onCancel?: () => void;
}) {
  const [c, setC] = useState(initial);
  const presets = CLASSES_BY_ID[c.classId].specs;
  const [custom, setCustom] = useState(!presets.includes(initial.spec));
  const update = (patch: Partial<Character>) => setC((prev) => ({ ...prev, ...patch }));

  return (
    <form
      className="panel"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ ...c, spec: c.spec.trim() || "Autre", name: c.name.trim() });
      }}
    >
      <h2>{isNew ? "Nouveau personnage" : "Modifier le personnage"}</h2>
      <div className="setup-grid">
        <label>
          Classe
          <select
            id="char-class"
            value={c.classId}
            onChange={(e) => {
              const classId = e.target.value as ClassId;
              setCustom(false);
              update({ classId, spec: CLASSES_BY_ID[classId].specs[0] });
            }}
          >
            {CLASSES.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Spécialisation
          <select
            id="char-spec"
            value={custom ? OTHER : c.spec}
            onChange={(e) => {
              if (e.target.value === OTHER) {
                setCustom(true);
                update({ spec: "" });
              } else {
                setCustom(false);
                update({ spec: e.target.value });
              }
            }}
          >
            {presets.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
            <option value={OTHER}>Autre…</option>
          </select>
        </label>
        <label>
          Magic Find (%)
          <input
            id="char-mf"
            type="number"
            min={0}
            max={1500}
            inputMode="numeric"
            value={c.magicFind}
            onChange={(e) => update({ magicFind: Math.max(0, Number(e.target.value) || 0) })}
          />
        </label>
        <label>
          Nom en jeu (facultatif)
          <input id="char-name" value={c.name} maxLength={20} onChange={(e) => update({ name: e.target.value })} placeholder="ex. Lyra" />
        </label>
        {custom && (
          <label className="full">
            Votre spécialisation
            <input id="char-spec-custom" value={c.spec} maxLength={30} autoFocus onChange={(e) => update({ spec: e.target.value })} placeholder="ex. Frozen Orb / Cold Mastery" />
          </label>
        )}
      </div>
      <p className="hint preview">
        Apparaîtra comme : <strong>{characterLabel({ ...c, spec: c.spec.trim() || "Autre" })}</strong>
      </p>
      <div className="actions">
        <button type="submit" className="primary">
          {isNew ? "Créer le personnage" : "Enregistrer"}
        </button>
        {onCancel && (
          <button type="button" className="secondary" onClick={onCancel}>
            Annuler
          </button>
        )}
      </div>
    </form>
  );
}

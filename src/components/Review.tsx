import { DROP_CATEGORIES } from "../data/drops";
import type { Route } from "../data/routes";
import { characterLabel, type Character } from "../lib/characters";
import type { IdentifiedItem, SavedSession } from "../lib/stats";
import { formatDuration } from "../format";
import ItemLog from "./ItemLog";

interface Props {
  session: SavedSession;
  character?: Character;
  route?: Route;
  onItemsChange: (items: IdentifiedItem[]) => void;
  onClose: () => void;
}

/** Revue d'une session : rappel des drops comptés et saisie des objets identifiés. */
export default function Review({ session, character, route, onItemsChange, onClose }: Props) {
  const counted = DROP_CATEGORIES.filter((c) => (session.counts[c.kind] ?? 0) > 0);
  return (
    <section className="panel review" aria-labelledby="review-title">
      <div className="toolbar">
        <h2 id="review-title">Revue des drops</h2>
        <button className="secondary" onClick={onClose}>
          Terminer la revue
        </button>
      </div>
      <p className="hint">
        {route?.name ?? "Route supprimée"} · {character ? characterLabel(character) : "Personnage supprimé"} ·{" "}
        {new Date(session.date).toLocaleDateString("fr-FR")} · {session.runs} runs en {formatDuration(session.durationSeconds)}
      </p>
      {counted.length > 0 && (
        <>
          <p className="review-label">Comptés pendant la session :</p>
          <div className="review-todo">
            {counted.map((c) => (
              <span key={c.kind} className={`badge k-${c.kind}`}>
                {session.counts[c.kind]} × {c.label}
              </span>
            ))}
          </div>
        </>
      )}
      <ItemLog inputId="review-item" items={session.items ?? []} character={character} onChange={onItemsChange} />
    </section>
  );
}

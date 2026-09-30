import { useEffect, useMemo, useRef } from "react";
import { ROUTES } from "./data/routes";
import { usePersistentState } from "./lib/storage";
import { migrateLegacySessions, normalizeCharacter, type Character } from "./lib/characters";
import { routeIndex, type CustomRoute } from "./lib/customRoutes";
import type { SavedSession, SessionSetup } from "./lib/stats";
import SessionTracker from "./components/SessionTracker";
import Comparison from "./components/Comparison";
import Characters from "./components/Characters";
import RoutesManager from "./components/RoutesManager";
import Help from "./components/Help";
import Maintenance from "./components/Maintenance";

type Tab = "session" | "comparison" | "characters" | "routes" | "help" | "maintenance";

const TABS: { id: Tab; label: string }[] = [
  { id: "session", label: "Session" },
  { id: "comparison", label: "Comparaison" },
  { id: "characters", label: "Personnages" },
  { id: "routes", label: "Routes" },
  { id: "help", label: "Aide" },
];

const DEFAULT_SETUP: SessionSetup = { characterId: "", routeId: ROUTES[0].id, magicFind: 300, players: 1 };

export default function App() {
  const [tab, setTab] = usePersistentState<Tab>("v2:tab", "session");
  const [setup, setSetup] = usePersistentState<SessionSetup>("v3:setup", DEFAULT_SETUP);
  const [storedCharacters, setCharacters] = usePersistentState<Character[]>("v3:characters", []);
  // Personnages créés avant l'ajout de Ladder / Hardcore : Ladder Softcore par défaut.
  const characters = useMemo(() => storedCharacters.map(normalizeCharacter), [storedCharacters]);
  const [sessions, setSessions] = usePersistentState<SavedSession[]>("v2:sessions", []);
  const [customRoutes, setCustomRoutes] = usePersistentState<CustomRoute[]>("v4:custom-routes", []);
  const routes = useMemo(() => routeIndex(customRoutes), [customRoutes]);
  const [maintenance, setMaintenance] = usePersistentState("v6:maintenance", false);
  const tabs = maintenance ? [...TABS, { id: "maintenance" as Tab, label: "Maintenance" }] : TABS;
  const current = tabs.some((t) => t.id === tab) ? tab : "session";
  const [reviewId, setReviewId] = usePersistentState<string | null>("v5:review", null);

  // Reprise des sessions v2 (liées à un build) : un personnage est créé par build.
  const migrated = useRef(false);
  useEffect(() => {
    if (migrated.current) return;
    migrated.current = true;
    const res = migrateLegacySessions(sessions, characters);
    if (!res.changed) return;
    setCharacters(res.characters);
    setSessions(res.sessions as SavedSession[]);
  }, [sessions, characters, setCharacters, setSessions]);

  const saveCharacter = (c: Character) =>
    setCharacters((prev) => (prev.some((x) => x.id === c.id) ? prev.map((x) => (x.id === c.id ? c : x)) : [...prev, c]));

  return (
    <div className="app">
      <header className="header">
        <h1>
          D2R <span>Run Profit</span>
        </h1>
        <p className="tagline">Comptez vos uniques, sets et runes par heure pour trouver le meilleur duo personnage + route.</p>
        <nav className="tabs" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={current === t.id}
              className={`${current === t.id ? "tab active" : "tab"}${t.id === "maintenance" ? " tab-maintenance" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.id === "maintenance" ? (
                <>
                  <span className="label-long">Maintenance</span>
                  <span className="label-short" aria-hidden="true">
                    Maint.
                  </span>
                </>
              ) : (
                t.label
              )}
              {t.id === "comparison" && sessions.length > 0 && <span className="tab-count">{sessions.length}</span>}
              {t.id === "characters" && characters.length > 0 && <span className="tab-count">{characters.length}</span>}
              {t.id === "routes" && customRoutes.length > 0 && <span className="tab-count">{customRoutes.length}</span>}
            </button>
          ))}
        </nav>
        <div className="maintenance-switch">
          <label className="checkbox">
            <input
              id="maintenance-toggle"
              type="checkbox"
              checked={maintenance}
              onChange={(e) => {
                setMaintenance(e.target.checked);
                setTab(e.target.checked ? "maintenance" : "session");
              }}
            />
            Mode maintenance
          </label>
        </div>
      </header>

      <main>
        {current === "session" && (
          <SessionTracker
            characters={characters}
            customRoutes={customRoutes}
            routes={routes}
            setup={setup}
            onSetupChange={setSetup}
            onSave={(s) => {
              setSessions((prev) => [s, ...prev]);
              // Fin de session : on enchaîne sur la revue des drops.
              setReviewId(s.id);
              setTab("comparison");
            }}
            onCharacterMagicFind={(id, magicFind) =>
              setCharacters((prev) => prev.map((c) => (c.id === id ? { ...c, magicFind } : c)))
            }
            onCreateCharacter={() => setTab("characters")}
          />
        )}
        {current === "comparison" && (
          <Comparison
            characters={characters}
            routes={routes}
            sessions={sessions}
            onDelete={(id) => setSessions((prev) => prev.filter((s) => s.id !== id))}
            reviewId={reviewId}
            onReview={setReviewId}
            onItemsChange={(id, items) => setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, items } : s)))}
          />
        )}
        {current === "characters" && (
          <Characters
            characters={characters}
            routes={routes}
            sessions={sessions}
            onSave={(c) => {
              saveCharacter(c);
              // Un personnage modifié qui est sélectionné garde sa MF à jour dans le formulaire de session.
              if (setup.characterId === c.id) setSetup({ ...setup, magicFind: c.magicFind });
            }}
            onDelete={(id) => {
              setCharacters((prev) => prev.filter((c) => c.id !== id));
              setSessions((prev) => prev.filter((s) => s.characterId !== id));
            }}
            onPlay={(id) => {
              const c = characters.find((x) => x.id === id)!;
              setSetup({ ...setup, characterId: id, magicFind: c.magicFind });
              setTab("session");
            }}
          />
        )}
        {current === "routes" && (
          <RoutesManager
            customRoutes={customRoutes}
            characters={characters}
            sessions={sessions}
            onSave={(r) =>
              setCustomRoutes((prev) => (prev.some((x) => x.id === r.id) ? prev.map((x) => (x.id === r.id ? r : x)) : [...prev, r]))
            }
            onDelete={(id) => {
              setCustomRoutes((prev) => prev.filter((r) => r.id !== id));
              setSessions((prev) => prev.filter((s) => s.routeId !== id));
            }}
            onPlay={(id) => {
              setSetup({ ...setup, routeId: id });
              setTab("session");
            }}
          />
        )}
        {current === "help" && <Help />}
        {current === "maintenance" && (
          <Maintenance
            characters={characters}
            customRoutes={customRoutes}
            routes={routes}
            sessions={sessions}
            onUpdate={(updated) => setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))}
            onDelete={(id) => setSessions((prev) => prev.filter((s) => s.id !== id))}
            onReview={(id) => {
              setReviewId(id);
              setTab("comparison");
            }}
          />
        )}
      </main>

      <footer className="footer">
        Projet communautaire non officiel. Diablo® II: Resurrected est une marque de Blizzard Entertainment.
      </footer>
    </div>
  );
}

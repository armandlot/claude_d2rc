import { useEffect, useRef } from "react";
import { ROUTES } from "./data/routes";
import { usePersistentState } from "./lib/storage";
import { migrateLegacySessions, type Character } from "./lib/characters";
import type { SavedSession, SessionSetup } from "./lib/stats";
import SessionTracker from "./components/SessionTracker";
import Comparison from "./components/Comparison";
import Characters from "./components/Characters";
import Help from "./components/Help";

type Tab = "session" | "comparison" | "characters" | "help";

const TABS: { id: Tab; label: string }[] = [
  { id: "session", label: "Session" },
  { id: "comparison", label: "Comparaison" },
  { id: "characters", label: "Personnages" },
  { id: "help", label: "Aide" },
];

const DEFAULT_SETUP: SessionSetup = { characterId: "", routeId: ROUTES[0].id, magicFind: 300, players: 1 };

export default function App() {
  const [tab, setTab] = usePersistentState<Tab>("v2:tab", "session");
  const [setup, setSetup] = usePersistentState<SessionSetup>("v3:setup", DEFAULT_SETUP);
  const [characters, setCharacters] = usePersistentState<Character[]>("v3:characters", []);
  const [sessions, setSessions] = usePersistentState<SavedSession[]>("v2:sessions", []);
  const current = TABS.some((t) => t.id === tab) ? tab : "session";

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
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={current === t.id}
              className={current === t.id ? "tab active" : "tab"}
              onClick={() => setTab(t.id)}
            >
              {t.label}
              {t.id === "comparison" && sessions.length > 0 && <span className="tab-count">{sessions.length}</span>}
              {t.id === "characters" && characters.length > 0 && <span className="tab-count">{characters.length}</span>}
            </button>
          ))}
        </nav>
      </header>

      <main>
        {current === "session" && (
          <SessionTracker
            characters={characters}
            setup={setup}
            onSetupChange={setSetup}
            onSave={(s) => {
              setSessions((prev) => [s, ...prev]);
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
            sessions={sessions}
            onDelete={(id) => setSessions((prev) => prev.filter((s) => s.id !== id))}
          />
        )}
        {current === "characters" && (
          <Characters
            characters={characters}
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
        {current === "help" && <Help />}
      </main>

      <footer className="footer">
        Projet communautaire non officiel. Diablo® II: Resurrected est une marque de Blizzard Entertainment.
      </footer>
    </div>
  );
}

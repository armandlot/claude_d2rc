import { BUILDS } from "./data/builds";
import { ROUTES } from "./data/routes";
import { usePersistentState } from "./lib/storage";
import type { SavedSession, SessionSetup } from "./lib/stats";
import SessionTracker from "./components/SessionTracker";
import Comparison from "./components/Comparison";
import Help from "./components/Help";

type Tab = "session" | "comparison" | "help";

const TABS: { id: Tab; label: string }[] = [
  { id: "session", label: "Session" },
  { id: "comparison", label: "Comparaison" },
  { id: "help", label: "Aide" },
];

const DEFAULT_SETUP: SessionSetup = { buildId: BUILDS[0].id, routeId: ROUTES[0].id, magicFind: 300, players: 1 };

export default function App() {
  const [tab, setTab] = usePersistentState<Tab>("v2:tab", "session");
  const [setup, setSetup] = usePersistentState<SessionSetup>("v2:setup", DEFAULT_SETUP);
  const [sessions, setSessions] = usePersistentState<SavedSession[]>("v2:sessions", []);
  const current = TABS.some((t) => t.id === tab) ? tab : "session";

  return (
    <div className="app">
      <header className="header">
        <h1>
          D2R <span>Run Profit</span>
        </h1>
        <p className="tagline">Comptez vos uniques, sets et runes par heure pour trouver votre meilleure route.</p>
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
            </button>
          ))}
        </nav>
      </header>

      <main>
        {current === "session" && (
          <SessionTracker
            setup={setup}
            onSetupChange={setSetup}
            onSave={(s) => {
              setSessions((prev) => [s, ...prev]);
              setTab("comparison");
            }}
          />
        )}
        {current === "comparison" && (
          <Comparison sessions={sessions} onDelete={(id) => setSessions((prev) => prev.filter((s) => s.id !== id))} />
        )}
        {current === "help" && <Help />}
      </main>

      <footer className="footer">
        Projet communautaire non officiel. Diablo® II: Resurrected est une marque de Blizzard Entertainment.
      </footer>
    </div>
  );
}

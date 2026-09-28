import { useState } from "react";
import { BUILDS } from "./data/builds";
import { DEFAULT_SETTINGS, type PriceTable, type RunSettings } from "./lib/profitability";
import { usePersistentState } from "./lib/storage";
import Simulator from "./components/Simulator";
import SessionTracker, { type SavedSession } from "./components/SessionTracker";
import Prices from "./components/Prices";
import Method from "./components/Method";

type Tab = "simulator" | "session" | "prices" | "method";

const TABS: { id: Tab; label: string }[] = [
  { id: "simulator", label: "Simulateur" },
  { id: "session", label: "Session" },
  { id: "prices", label: "Prix" },
  { id: "method", label: "Méthode" },
];

/** Temps de run personnalisés, clé `${buildId}:${routeId}`. */
export type RunTimeOverrides = Record<string, number>;

export default function App() {
  const [tab, setTab] = usePersistentState<Tab>("tab", "simulator");
  const [buildId, setBuildId] = usePersistentState("build", BUILDS[0].id);
  const [settings, setSettings] = usePersistentState<RunSettings>("settings", DEFAULT_SETTINGS);
  const [prices, setPrices] = usePersistentState<PriceTable>("prices", {});
  const [overrides, setOverrides] = usePersistentState<RunTimeOverrides>("overrides", {});
  const [sessions, setSessions] = usePersistentState<SavedSession[]>("sessions", []);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);

  const setOverride = (routeId: string, seconds: number | null, forBuild = buildId) =>
    setOverrides((prev) => {
      const next = { ...prev };
      const key = `${forBuild}:${routeId}`;
      if (seconds && seconds > 0) next[key] = seconds;
      else delete next[key];
      return next;
    });

  return (
    <div className="app">
      <header className="header">
        <h1>
          D2R <span>Run Profit</span>
        </h1>
        <p className="tagline">Quelle route farmer avec votre personnage ? Valeur estimée en runes Ist par heure.</p>
        <nav className="tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              className={tab === t.id ? "tab active" : "tab"}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main>
        {tab === "simulator" && (
          <Simulator
            buildId={buildId}
            onBuildChange={setBuildId}
            settings={settings}
            onSettingsChange={setSettings}
            prices={prices}
            overrides={overrides}
            onOverrideChange={setOverride}
            selectedRoute={selectedRoute}
            onSelectRoute={setSelectedRoute}
          />
        )}
        {tab === "session" && (
          <SessionTracker
            buildId={buildId}
            settings={settings}
            prices={prices}
            overrides={overrides}
            sessions={sessions}
            onSessionsChange={setSessions}
            onUseRunTime={(sessionBuildId, routeId, seconds) => {
              setOverride(routeId, seconds, sessionBuildId);
              setBuildId(sessionBuildId);
              setSelectedRoute(routeId);
              setTab("simulator");
            }}
          />
        )}
        {tab === "prices" && <Prices prices={prices} onChange={setPrices} />}
        {tab === "method" && <Method />}
      </main>

      <footer className="footer">
        Projet communautaire non officiel. Diablo® II: Resurrected est une marque de Blizzard Entertainment.
      </footer>
    </div>
  );
}

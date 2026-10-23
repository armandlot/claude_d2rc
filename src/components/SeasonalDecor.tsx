import { useEffect, useState } from "react";
import { activeSeasonalTheme, type SeasonalTheme } from "../lib/seasonal";

/** Thème saisonnier actif, réévalué chaque minute et au retour au premier plan. */
export function useSeasonalTheme(): SeasonalTheme | null {
  const [theme, setTheme] = useState(() => activeSeasonalTheme(new Date()));

  useEffect(() => {
    const check = () => setTheme(activeSeasonalTheme(new Date()));
    const timer = window.setInterval(check, 60_000);
    document.addEventListener("visibilitychange", check);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);

  // Couleurs du thème : attribut sur <html> + couleur de la barre système (PWA).
  useEffect(() => {
    const root = document.documentElement;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (theme) root.dataset.season = theme.id;
    else delete root.dataset.season;
    meta?.setAttribute("content", theme ? "#120a16" : "#110d0a");
  }, [theme]);

  return theme;
}

/** Décor d'en-tête : ruban, lune, chauves-souris et citrouille. */
export default function SeasonalDecor({ theme }: { theme: SeasonalTheme }) {
  return (
    <>
      <div className="season-sky" aria-hidden="true">
        <svg className="moon" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="#f6d58a" />
          <circle cx="36" cy="40" r="7" fill="#e7bf6a" />
          <circle cx="60" cy="62" r="10" fill="#e7bf6a" />
          <circle cx="63" cy="33" r="5" fill="#e7bf6a" />
        </svg>
        {[0, 1, 2].map((i) => (
          <svg key={i} className={`bat bat-${i}`} viewBox="0 0 64 28">
            <path
              d="M32 10c2-4 5-6 5-6s1 4-1 7c4-3 10-5 16-4-3 2-4 5-4 9-3-3-7-3-10 0-2-2-4-3-6-3s-4 1-6 3c-3-3-7-3-10 0 0-4-1-7-4-9 6-1 12 1 16 4-2-3-1-7-1-7s3 2 5 6z"
              fill="#0a060c"
            />
          </svg>
        ))}
        <svg className="web" viewBox="0 0 100 100">
          <g fill="none" stroke="#b9a6c8" strokeWidth="0.8" opacity="0.55">
            <path d="M100 0 L0 100 M100 0 L30 100 M100 0 L60 100 M100 0 L0 30 M100 0 L0 60" />
            <path d="M80 0 Q86 14 100 20 M60 0 Q70 28 100 40 M40 0 Q56 42 100 60 M20 0 Q40 58 100 80" />
          </g>
        </svg>
      </div>
      <p className="season-ribbon" role="note">
        <svg className="pumpkin" viewBox="0 0 64 64" aria-hidden="true">
          <path d="M30 10c0-4 3-6 6-6l1 3c-2 0-3 1-3 4z" fill="#3f6b2a" />
          <ellipse cx="32" cy="38" rx="27" ry="22" fill="#ff7518" />
          <ellipse cx="32" cy="38" rx="13" ry="22" fill="#e8620c" />
          <ellipse cx="32" cy="38" rx="4" ry="22" fill="#ff8a33" />
          <path d="M18 32l7 5-8 2zM46 32l-7 5 8 2zM20 46c6 6 18 6 24 0l-4 1-2 3-3-3-3 3-3-3-3 3-2-3z" fill="#2a1306" />
        </svg>
        <strong>{theme.label}</strong>
        <span>{theme.tagline}</span>
      </p>
    </>
  );
}

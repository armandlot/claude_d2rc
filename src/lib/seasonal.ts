/**
 * Thèmes saisonniers temporaires. Les dates sont en heure locale de l'appareil
 * (pas de fuseau dans la chaîne) : la fin tombe à minuit chez le joueur.
 * Pour retirer un thème expiré, il suffit de supprimer son entrée et son CSS.
 */
export interface SeasonalTheme {
  id: "halloween";
  label: string;
  /** Début inclus (heure locale). */
  start: string;
  /** Fin exclue (heure locale). */
  end: string;
  /** Texte affiché pendant la période. */
  tagline: string;
}

export const SEASONAL_THEMES: SeasonalTheme[] = [
  {
    id: "halloween",
    label: "Édition Halloween",
    start: "2026-10-23T00:00:00",
    end: "2026-11-02T00:00:00",
    tagline: "Jusqu'au 1er novembre inclus : que les uniques sortent de leur tombe.",
  },
];

/** Thème actif à cette date, ou null. */
export function activeSeasonalTheme(now: Date, themes: SeasonalTheme[] = SEASONAL_THEMES): SeasonalTheme | null {
  const t = now.getTime();
  return themes.find((s) => t >= new Date(s.start).getTime() && t < new Date(s.end).getTime()) ?? null;
}

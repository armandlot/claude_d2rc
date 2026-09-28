import { useEffect, useState } from "react";

const PREFIX = "d2r-run-profit:";

/** État React persisté dans localStorage (tolère un stockage indisponible). */
export function usePersistentState<T>(key: string, initial: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw === null) return initial;
      const parsed = JSON.parse(raw);
      // Fusionne avec les valeurs par défaut pour supporter l'ajout de champs.
      return isPlainObject(initial) && isPlainObject(parsed) ? ({ ...initial, ...parsed } as T) : parsed;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      // Stockage indisponible (navigation privée…) : l'app reste utilisable.
    }
  }, [key, value]);

  return [value, setValue];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

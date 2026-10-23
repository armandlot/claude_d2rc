import { useCallback, useRef, useState } from "react";

const PREFIX = "d2r-run-counter:";
// Ancien nom de l'application : les données sont reprises une seule fois.
const LEGACY_PREFIX = "d2r-run-profit:";

/** Copie les clés enregistrées sous l'ancien nom vers le nouveau (sans écraser). */
export function migrateLegacyStorage(storage: Storage): number {
  let moved = 0;
  try {
    // Liste figée d'abord : ajouter ou retirer des clés décale leurs positions.
    const keys = Array.from({ length: storage.length }, (_, i) => storage.key(i));
    for (const key of keys) {
      if (!key?.startsWith(LEGACY_PREFIX)) continue;
      const next = PREFIX + key.slice(LEGACY_PREFIX.length);
      if (storage.getItem(next) === null) {
        storage.setItem(next, storage.getItem(key)!);
        moved++;
      }
      storage.removeItem(key);
    }
  } catch {
    // Stockage indisponible : rien à reprendre.
  }
  return moved;
}

try {
  if (typeof localStorage !== "undefined") migrateLegacyStorage(localStorage);
} catch {
  // localStorage inaccessible (navigation privée stricte).
}

function read<T>(key: string, initial: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return initial;
    const parsed = JSON.parse(raw);
    // Fusionne avec les valeurs par défaut pour supporter l'ajout de champs.
    return isPlainObject(initial) && isPlainObject(parsed) ? ({ ...initial, ...parsed } as T) : parsed;
  } catch {
    return initial;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Stockage indisponible (navigation privée…) : l'app reste utilisable.
  }
}

/**
 * État React persisté dans localStorage. L'écriture est immédiate (et non dans un
 * effet) pour ne rien perdre si le composant est démonté juste après.
 */
export function usePersistentState<T>(key: string, initial: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => read(key, initial));
  // Valeur la plus récente, connue même avant le prochain rendu.
  const latest = useRef(value);

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      const resolved = typeof next === "function" ? (next as (prev: T) => T)(latest.current) : next;
      latest.current = resolved;
      write(key, resolved);
      setValue(resolved);
    },
    [key],
  );

  return [value, set];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

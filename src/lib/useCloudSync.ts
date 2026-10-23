import { useCallback, useEffect, useRef, useState } from "react";
import { canonical } from "./canonical";
import { usePersistentState } from "./storage";
import { api, ApiUnavailable, decideSync, hasData, INITIAL_META, newProfileKey, type Snapshot, type SyncMeta } from "./sync";

/**
 * - local : pas d'API (hébergement statique) — les données restent sur l'appareil ;
 * - offline : API injoignable pour l'instant, les modifications attendent ;
 * - syncing / synced / error : échanges avec Cloudflare D1.
 */
export type SyncStatus = "local" | "offline" | "syncing" | "synced" | "error";

const PUSH_DELAY_MS = 1500;

/**
 * Synchronise les données de l'application avec l'API (Cloudflare D1).
 * Le localStorage reste la source immédiate (hors ligne, PWA) ; le serveur
 * permet de retrouver ses données et de les partager entre appareils.
 */
export function useCloudSync(data: Snapshot, apply: (remote: Snapshot) => void) {
  const [key, setKey] = usePersistentState<string>("v7:profile-key", "");
  const [meta, setMeta] = usePersistentState<SyncMeta>("v7:sync", INITIAL_META);
  const [status, setStatus] = useState<SyncStatus>("syncing");
  const [message, setMessage] = useState("");

  // Valeurs les plus récentes, lues par les traitements asynchrones.
  const dataRef = useRef(data);
  dataRef.current = data;
  const metaRef = useRef(meta);
  metaRef.current = meta;
  // Données telles qu'alignées avec le serveur : sert à ignorer les changements venus du serveur.
  const alignedJson = useRef<string | null>(null);
  const busy = useRef(false);
  const timer = useRef<number | undefined>(undefined);

  // Une clé par appareil, créée au premier lancement.
  const profileKey = key || newProfileKey();
  useEffect(() => {
    if (!key) setKey(profileKey);
  }, [key, profileKey, setKey]);

  const fail = useCallback((e: unknown) => {
    if (e instanceof ApiUnavailable) {
      // Jamais joint : hébergement sans API. Déjà joint : simple coupure réseau.
      setStatus(metaRef.current.syncedAt === null ? "local" : "offline");
      setMessage("");
    } else {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const push = useCallback(async () => {
    const snapshot = dataRef.current;
    const changedAt = metaRef.current.changedAt;
    const res = await api.put(profileKey, snapshot);
    alignedJson.current = canonical(snapshot);
    // D'autres modifications ont pu arriver pendant l'envoi : elles restent à envoyer.
    setMeta((m) => ({ ...m, syncedAt: res.updatedAt, dirty: m.changedAt !== changedAt }));
  }, [profileKey, setMeta]);

  /** Compare l'appareil et le serveur, puis envoie ou récupère. */
  const reconcile = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setStatus("syncing");
    try {
      const remote = await api.get(profileKey);
      const remoteUpdatedAt = "updatedAt" in remote ? remote.updatedAt : null;
      const decision = decideSync(metaRef.current, remoteUpdatedAt, hasData(dataRef.current));
      if (decision === "pull" && "updatedAt" in remote) {
        const snapshot = { characters: remote.characters, customRoutes: remote.customRoutes, sessions: remote.sessions };
        alignedJson.current = canonical(snapshot);
        apply(snapshot);
        setMeta({ syncedAt: remote.updatedAt, dirty: false, changedAt: metaRef.current.changedAt });
      } else if (decision === "push") {
        await push();
      } else {
        alignedJson.current = canonical(dataRef.current);
        if (remoteUpdatedAt !== null && metaRef.current.syncedAt === null) setMeta((m) => ({ ...m, syncedAt: remoteUpdatedAt }));
      }
      setStatus("synced");
      setMessage("");
    } catch (e) {
      fail(e);
    } finally {
      busy.current = false;
      // Une modification faite pendant l'échange : nouvel envoi.
      if (metaRef.current.dirty) schedule();
    }
  }, [profileKey, apply, push, fail, setMeta]);

  const schedule = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void reconcile(), PUSH_DELAY_MS);
  }, [reconcile]);

  // Toute modification locale (hors données venues du serveur) est à envoyer.
  const json = canonical(data);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (json === alignedJson.current) return;
    setMeta((m) => ({ ...m, dirty: true, changedAt: Date.now() }));
    schedule();
  }, [json, schedule, setMeta]);

  // Au démarrage, au retour du réseau et quand l'application revient au premier plan.
  useEffect(() => {
    void reconcile();
    const onVisible = () => document.visibilityState === "visible" && void reconcile();
    window.addEventListener("online", reconcile);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", reconcile);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearTimeout(timer.current);
    };
  }, [reconcile]);

  /** Relie cet appareil à un autre profil : ses données remplacent celles de l'appareil. */
  const linkProfile = useCallback(
    (next: string) => {
      setStatus("syncing");
      setMeta(INITIAL_META);
      metaRef.current = INITIAL_META;
      // Changer de clé ne modifie pas les données : ne rien marquer « à envoyer ».
      alignedJson.current = canonical(dataRef.current);
      setKey(next);
    },
    [setKey, setMeta],
  );

  return { status, message, profileKey, pending: meta.dirty, syncNow: reconcile, linkProfile };
}

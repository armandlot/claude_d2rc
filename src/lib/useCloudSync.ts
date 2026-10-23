import { useCallback, useEffect, useRef, useState } from "react";
import { canonical } from "./canonical";
import { usePersistentState } from "./storage";
import { api, ApiUnavailable, decideSync, hasData, INITIAL_META, newProfileKey, SignedOut, type Snapshot, type SyncMeta } from "./sync";

/**
 * - local : pas d'API (hébergement statique) — les données restent sur l'appareil ;
 * - offline : API injoignable pour l'instant, les modifications attendent ;
 * - syncing / synced / error : échanges avec Cloudflare D1 ;
 * - signed-out : compte dont la session a expiré — les modifications attendent la reconnexion.
 */
export type SyncStatus = "local" | "offline" | "syncing" | "synced" | "error" | "signed-out";

/** Retour de la page de connexion Google (`/?auth=…`). */
export type AuthNotice = "ok" | "annule" | "erreur" | "indisponible";

export interface AuthState {
  /** Connexion Google configurée sur le serveur. */
  enabled: boolean;
  /** Compte auquel appartiennent les données de l'appareil (null : profil anonyme). */
  account: string | null;
}

const PUSH_DELAY_MS = 1500;
const EMPTY: Snapshot = { characters: [], customRoutes: [], sessions: [] };
const pick = (r: Snapshot): Snapshot => ({ characters: r.characters, customRoutes: r.customRoutes, sessions: r.sessions });

function readNotice(): AuthNotice | null {
  const url = new URL(window.location.href);
  const value = url.searchParams.get("auth");
  if (!value) return null;
  url.searchParams.delete("auth");
  window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  return (["ok", "annule", "erreur", "indisponible"] as const).find((n) => n === value) ?? "erreur";
}

/**
 * Synchronise les données de l'application avec l'API (Cloudflare D1).
 * Le localStorage reste la source immédiate (hors ligne, PWA) ; le serveur
 * permet de retrouver ses données et de les partager entre appareils.
 * Sans compte, un profil anonyme (clé aléatoire) sauvegarde l'appareil ;
 * connecté avec Google, les données suivent le compte sur tous les appareils.
 */
export function useCloudSync(data: Snapshot, apply: (remote: Snapshot) => void) {
  const [key, setKey] = usePersistentState<string>("v7:profile-key", "");
  const [meta, setMeta] = usePersistentState<SyncMeta>("v7:sync", INITIAL_META);
  const [account, setAccount] = usePersistentState<string | null>("v8:account", null);
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState<SyncStatus>("syncing");
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState<AuthNotice | null>(readNotice);

  // Valeurs les plus récentes, lues par les traitements asynchrones.
  const dataRef = useRef(data);
  dataRef.current = data;
  const metaRef = useRef(meta);
  metaRef.current = meta;
  const accountRef = useRef(account);
  accountRef.current = account;
  // Données telles qu'alignées avec le serveur : sert à ignorer les changements venus du serveur.
  const alignedJson = useRef<string | null>(null);
  const busy = useRef(false);
  const timer = useRef<number | undefined>(undefined);

  // Une clé par appareil, créée au premier lancement.
  const profileKey = key || newProfileKey();
  const keyRef = useRef(profileKey);
  keyRef.current = profileKey;
  useEffect(() => {
    if (!key) setKey(profileKey);
  }, [key, profileKey, setKey]);

  /** Identifiant envoyé à l'API : la clé anonyme, ou rien (cookie du compte). */
  const credential = () => (accountRef.current === null ? keyRef.current : null);

  const fail = useCallback((e: unknown) => {
    if (e instanceof ApiUnavailable) {
      // Jamais joint : hébergement sans API. Déjà joint : simple coupure réseau.
      setStatus(metaRef.current.syncedAt === null && accountRef.current === null ? "local" : "offline");
      setMessage("");
    } else if (e instanceof SignedOut) {
      setStatus("signed-out");
      setMessage("");
    } else {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : String(e));
    }
  }, []);

  /** Remplace les données de l'appareil par celles du serveur. */
  const adoptRemote = useCallback(
    (snapshot: Snapshot, syncedAt: number | null) => {
      alignedJson.current = canonical(snapshot);
      apply(snapshot);
      const next = { syncedAt, dirty: false, changedAt: metaRef.current.changedAt };
      metaRef.current = next;
      setMeta(next);
    },
    [apply, setMeta],
  );

  const push = useCallback(async () => {
    const snapshot = dataRef.current;
    const changedAt = metaRef.current.changedAt;
    const res = await api.put(credential(), snapshot);
    alignedJson.current = canonical(snapshot);
    // D'autres modifications ont pu arriver pendant l'envoi : elles restent à envoyer.
    setMeta((m) => ({ ...m, syncedAt: res.updatedAt, dirty: m.changedAt !== changedAt }));
  }, [setMeta]);

  /** Compare l'appareil et le serveur, puis envoie ou récupère. */
  const reconcile = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setStatus("syncing");
    try {
      const remote = await api.get(credential());
      const remoteUpdatedAt = "updatedAt" in remote ? remote.updatedAt : null;
      const decision = decideSync(metaRef.current, remoteUpdatedAt, hasData(dataRef.current));
      if (decision === "pull" && "updatedAt" in remote) {
        adoptRemote(pick(remote), remote.updatedAt);
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
  }, [adoptRemote, push, fail, setMeta]);

  const schedule = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void reconcile(), PUSH_DELAY_MS);
  }, [reconcile]);

  /**
   * Fait le point sur le compte avant de synchroniser :
   * - juste connecté : les données de l'appareil rejoignent celles du compte ;
   * - autre compte que celui des données : on repart des données de ce compte ;
   * - session expirée : on attend la reconnexion (rien n'est perdu).
   * Renvoie false s'il ne faut pas synchroniser.
   */
  const checkAccount = useCallback(async (): Promise<boolean> => {
    if (busy.current) return false;
    busy.current = true;
    try {
      const me = await api.me();
      setEnabled(me.enabled);
      const userId = me.user?.id ?? null;
      if (userId && accountRef.current === null) {
        setStatus("syncing");
        const merged = await api.adopt(dataRef.current, keyRef.current);
        adoptRemote(pick(merged), merged.updatedAt);
        accountRef.current = userId;
        setAccount(userId);
        // L'ancien profil anonyme a été effacé par le serveur.
        setKey(newProfileKey());
      } else if (userId && accountRef.current !== userId) {
        metaRef.current = INITIAL_META;
        setMeta(INITIAL_META);
        alignedJson.current = canonical(dataRef.current);
        accountRef.current = userId;
        setAccount(userId);
      } else if (!userId && accountRef.current !== null) {
        setStatus("signed-out");
        return false;
      }
      return true;
    } catch (e) {
      fail(e);
      // Hors ligne : la synchronisation réessaiera d'elle-même.
      return !(e instanceof ApiUnavailable);
    } finally {
      busy.current = false;
    }
  }, [adoptRemote, fail, setAccount, setKey, setMeta]);

  const refresh = useCallback(async () => {
    if (await checkAccount()) await reconcile();
  }, [checkAccount, reconcile]);

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
    void refresh();
    const onOnline = () => void refresh();
    const onVisible = () => document.visibilityState === "visible" && void refresh();
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearTimeout(timer.current);
    };
  }, [refresh]);

  /** Part chez Google ; on revient sur `/?auth=…`. */
  const login = useCallback(() => {
    window.location.assign("/api/auth/google/start");
  }, []);

  /** Données du compte retirées de l'appareil : il repart vide, en profil anonyme. */
  const forget = useCallback(() => {
    window.clearTimeout(timer.current);
    adoptRemote(EMPTY, null);
    accountRef.current = null;
    setAccount(null);
    keyRef.current = newProfileKey();
    setKey(keyRef.current);
    setStatus("synced");
  }, [adoptRemote, setAccount, setKey]);

  const logout = useCallback(
    async (everywhere: boolean) => {
      try {
        // Dernières modifications envoyées avant de quitter l'appareil.
        if (metaRef.current.dirty) await push();
        await api.logout(everywhere);
      } catch (e) {
        if (!(e instanceof SignedOut)) throw e;
      }
      forget();
    },
    [push, forget],
  );

  const deleteAccount = useCallback(async () => {
    await api.deleteAccount();
    forget();
  }, [forget]);

  const auth: AuthState = { enabled, account };
  return {
    status,
    message,
    pending: meta.dirty,
    syncNow: refresh,
    auth,
    notice,
    dismissNotice: () => setNotice(null),
    login,
    logout,
    deleteAccount,
  };
}

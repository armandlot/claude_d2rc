import { useState } from "react";
import type { AuthNotice, AuthState, SyncStatus } from "../lib/useCloudSync";

interface Props {
  status: SyncStatus;
  message: string;
  pending: boolean;
  auth: AuthState;
  notice: AuthNotice | null;
  onDismissNotice: () => void;
  onSyncNow: () => void;
  onLogin: () => void;
  onLogout: (everywhere: boolean) => Promise<void>;
  onDeleteAccount: () => Promise<void>;
}

const LABEL: Record<SyncStatus, string> = {
  local: "Données sur cet appareil",
  offline: "Hors ligne",
  syncing: "Synchronisation…",
  synced: "Synchronisé",
  error: "Erreur de synchronisation",
  "signed-out": "Session expirée",
};

const NOTICE: Record<AuthNotice, string> = {
  ok: "Connecté avec Google : vos données suivent désormais votre compte.",
  annule: "Connexion annulée.",
  erreur: "La connexion avec Google a échoué. Réessayez dans un instant.",
  indisponible: "La connexion avec Google n'est pas encore activée sur ce serveur.",
};

/** Bouton « Se connecter avec Google » (charte Google : logo G sur fond clair). */
function GoogleButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button className="google-btn" onClick={onClick}>
      <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      </svg>
      {label}
    </button>
  );
}

export default function SyncPanel(props: Props) {
  const { status, message, pending, auth, notice, onDismissNotice, onSyncNow, onLogin, onLogout, onDeleteAccount } = props;
  const [open, setOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const [failure, setFailure] = useState("");
  const label = status === "synced" && pending ? "Modifications en attente" : LABEL[status];
  const signedIn = auth.account !== null;

  const run = async (action: () => Promise<void>) => {
    setWorking(true);
    setFailure("");
    try {
      await action();
      setOpen(false);
    } catch (e) {
      setFailure(e instanceof Error ? e.message : String(e));
    } finally {
      setWorking(false);
    }
  };

  const logout = (everywhere: boolean) => {
    const text = everywhere
      ? "Déconnecter tous vos appareils ? Sur chacun, les données seront retirées (elles restent dans votre compte)."
      : "Se déconnecter ? Les données seront retirées de cet appareil ; elles restent dans votre compte.";
    if (window.confirm(text)) void run(() => onLogout(everywhere));
  };

  const remove = () => {
    if (
      window.confirm(
        "Supprimer définitivement votre compte ? Toutes vos données (personnages, routes, sessions) seront effacées du serveur et de cet appareil.",
      )
    )
      void run(onDeleteAccount);
  };

  return (
    <div className="sync">
      <button className={`sync-badge s-${status}`} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="dot" aria-hidden="true" />
        {label}
      </button>
      {notice && (
        <p className={`auth-notice ${notice === "ok" ? "n-ok" : "n-warn"}`} role="status">
          {NOTICE[notice]}
          <button className="link" onClick={onDismissNotice} aria-label="Fermer">
            ×
          </button>
        </p>
      )}
      {open && (
        <section className="panel sync-panel" aria-label="Compte et synchronisation">
          {status === "local" ? (
            <p>
              Cette version n'a pas de serveur : vos données restent dans ce navigateur. Déployée sur Cloudflare, l'application
              les sauvegarde en ligne et les partage entre vos appareils.
            </p>
          ) : (
            <>
              {status === "error" && <p className="mnt-errors">{message}</p>}
              {failure && <p className="mnt-errors">{failure}</p>}

              {signedIn && status === "signed-out" && (
                <>
                  <h3>Session expirée</h3>
                  <p className="hint">
                    Reconnectez-vous pour reprendre la synchronisation. Vos modifications sont gardées sur cet appareil en
                    attendant.
                  </p>
                  <GoogleButton label="Se reconnecter avec Google" onClick={onLogin} />
                </>
              )}

              {signedIn && status !== "signed-out" && (
                <>
                  <h3>Connecté avec Google</h3>
                  <p className="hint">
                    Vos données suivent votre compte : connectez-vous avec le même compte Google sur vos autres appareils.
                    Elles restent utilisables hors ligne et partent dès que la connexion revient.
                  </p>
                  <div className="key-row">
                    <button className="secondary" onClick={onSyncNow} disabled={status === "syncing" || working}>
                      Synchroniser maintenant
                    </button>
                    <button className="secondary" onClick={() => logout(false)} disabled={working}>
                      Se déconnecter
                    </button>
                    <button className="secondary" onClick={() => logout(true)} disabled={working}>
                      Déconnecter tous mes appareils
                    </button>
                  </div>
                  <p className="hint">
                    <button className="link danger" onClick={remove} disabled={working}>
                      Supprimer mon compte et mes données
                    </button>
                  </p>
                </>
              )}

              {!signedIn && (
                <>
                  <p>
                    Vos données sont sauvegardées sur le serveur pour cet appareil, et restent utilisables hors ligne.
                  </p>
                  {auth.enabled && (
                    <>
                      <h3>Retrouver vos données sur tous vos appareils</h3>
                      <p className="hint">
                        Connectez-vous avec Google : les données de cet appareil rejoignent votre compte. Seul un identifiant
                        anonyme fourni par Google est utilisé : ni e-mail, ni nom, ni mot de passe.
                      </p>
                      <GoogleButton label="Se connecter avec Google" onClick={onLogin} />
                    </>
                  )}
                  <div className="key-row">
                    <button className="secondary" onClick={onSyncNow} disabled={status === "syncing"}>
                      Synchroniser maintenant
                    </button>
                  </div>
                </>
              )}
              <p className="hint">
                <a href="/confidentialite" target="_blank" rel="noopener">
                  Données personnelles et confidentialité
                </a>
              </p>
            </>
          )}
        </section>
      )}
    </div>
  );
}

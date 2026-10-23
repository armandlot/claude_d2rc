import { useState } from "react";
import { isProfileKey } from "../lib/sync";
import type { SyncStatus } from "../lib/useCloudSync";

interface Props {
  status: SyncStatus;
  message: string;
  pending: boolean;
  profileKey: string;
  onSyncNow: () => void;
  onLinkProfile: (key: string) => void;
}

const LABEL: Record<SyncStatus, string> = {
  local: "Données sur cet appareil",
  offline: "Hors ligne",
  syncing: "Synchronisation…",
  synced: "Synchronisé",
  error: "Erreur de synchronisation",
};

export default function SyncPanel({ status, message, pending, profileKey, onSyncNow, onLinkProfile }: Props) {
  const [open, setOpen] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [other, setOther] = useState("");
  const [copied, setCopied] = useState(false);
  const label = status === "synced" && pending ? "Modifications en attente" : LABEL[status];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(profileKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setReveal(true);
    }
  };

  return (
    <div className="sync">
      <button className={`sync-badge s-${status}`} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="dot" aria-hidden="true" />
        {label}
      </button>
      {open && (
        <section className="panel sync-panel" aria-label="Synchronisation">
          {status === "local" ? (
            <p>
              Cette version n'a pas de serveur : vos données restent dans ce navigateur. Déployée sur Cloudflare, l'application
              les sauvegarde en ligne et les partage entre vos appareils.
            </p>
          ) : (
            <>
              <p>
                Vos données sont sauvegardées sur le serveur et restent utilisables hors ligne : les modifications partent dès
                que la connexion revient.
              </p>
              {status === "error" && <p className="mnt-errors">{message}</p>}
              <h3>Clé de profil</h3>
              <p className="hint">
                Elle identifie vos données, sans compte ni mot de passe. Gardez-la secrète : qui la possède voit et modifie vos
                sessions.
              </p>
              <div className="key-row">
                <code>{reveal ? profileKey : `${profileKey.slice(0, 4)}…${"•".repeat(12)}`}</code>
                <button className="secondary" onClick={() => setReveal((r) => !r)}>
                  {reveal ? "Masquer" : "Afficher"}
                </button>
                <button className="secondary" onClick={copy}>
                  {copied ? "Copiée ✓" : "Copier"}
                </button>
                <button className="secondary" onClick={onSyncNow} disabled={status === "syncing"}>
                  Synchroniser maintenant
                </button>
              </div>
              <h3>Relier un autre appareil</h3>
              <p className="hint">
                Sur le second appareil, collez la clé du premier. Les données du profil remplacent alors celles de cet
                appareil ; si le profil est vide, ce sont celles de cet appareil qui y sont copiées.
              </p>
              <form
                className="key-row"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (isProfileKey(other.trim())) {
                    onLinkProfile(other.trim());
                    setOther("");
                  }
                }}
              >
                <label htmlFor="other-key" className="sr-only">
                  Clé d'un autre appareil
                </label>
                <input id="other-key" value={other} onChange={(e) => setOther(e.target.value)} placeholder="Clé de l'autre appareil" autoComplete="off" />
                <button type="submit" className="primary" disabled={!isProfileKey(other.trim()) || other.trim() === profileKey}>
                  Utiliser cette clé
                </button>
              </form>
              {other.trim() && !isProfileKey(other.trim()) && <p className="hint">Clé incomplète : 22 caractères minimum.</p>}
            </>
          )}
        </section>
      )}
    </div>
  );
}

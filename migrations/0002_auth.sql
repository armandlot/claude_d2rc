-- D2R Run Counter : comptes « Se connecter avec Google ».
--
-- Données minimales : Google ne transmet que l'identifiant opaque du compte
-- (« sub », accès `openid` seul : ni e-mail, ni nom). Il est stocké haché
-- (HMAC-SHA256 avec une clé secrète du serveur), jamais en clair.
-- Les données de jeu d'un compte vivent dans le profil « u:<users.id> ».

CREATE TABLE IF NOT EXISTS users (
  id              TEXT    PRIMARY KEY,      -- identifiant aléatoire
  google_sub_hash TEXT    NOT NULL UNIQUE,  -- HMAC(sub Google)
  created_at      INTEGER NOT NULL,
  last_login_at   INTEGER NOT NULL
);

-- Sessions de connexion (cookie). On ne stocke que l'empreinte du jeton.
CREATE TABLE IF NOT EXISTS auth_sessions (
  id_hash    TEXT    PRIMARY KEY,
  user_id    TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS auth_sessions_by_user ON auth_sessions (user_id);

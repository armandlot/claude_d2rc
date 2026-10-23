-- D2R Run Counter : schéma initial (Cloudflare D1 / SQLite).
--
-- Pas de comptes utilisateurs : chaque appareil (ou groupe d'appareils liés)
-- possède une « clé de profil » secrète. On n'en stocke que l'empreinte SHA-256
-- (profiles.id), jamais la clé elle-même.

CREATE TABLE IF NOT EXISTS profiles (
  id         TEXT    PRIMARY KEY,           -- SHA-256 hexadécimal de la clé de profil
  created_at INTEGER NOT NULL,              -- ms depuis l'epoch
  updated_at INTEGER NOT NULL               -- dernière modification des données (ms)
);

CREATE TABLE IF NOT EXISTS characters (
  profile_id TEXT    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  id         TEXT    NOT NULL,
  position   INTEGER NOT NULL,              -- ordre d'affichage
  name       TEXT    NOT NULL DEFAULT '',
  class_id   TEXT    NOT NULL,
  spec       TEXT    NOT NULL,
  magic_find INTEGER NOT NULL,
  ladder     INTEGER NOT NULL DEFAULT 1,    -- booléen 0/1
  hardcore   INTEGER NOT NULL DEFAULT 0,    -- booléen 0/1
  PRIMARY KEY (profile_id, id)
);

CREATE TABLE IF NOT EXISTS custom_routes (
  profile_id TEXT    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  id         TEXT    NOT NULL,
  position   INTEGER NOT NULL,
  name       TEXT    NOT NULL DEFAULT '',
  stops      TEXT    NOT NULL,              -- JSON : identifiants d'étapes dans l'ordre
  PRIMARY KEY (profile_id, id)
);

CREATE TABLE IF NOT EXISTS sessions (
  profile_id       TEXT    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  id               TEXT    NOT NULL,
  date             TEXT    NOT NULL,        -- ISO 8601
  character_id     TEXT    NOT NULL,
  route_id         TEXT    NOT NULL,
  magic_find       INTEGER NOT NULL,
  players          INTEGER NOT NULL,
  duration_seconds INTEGER NOT NULL,
  runs             INTEGER NOT NULL,
  counts           TEXT    NOT NULL,        -- JSON : drops par catégorie (évolue sans migration)
  items            TEXT    NOT NULL DEFAULT '[]', -- JSON : objets identifiés
  PRIMARY KEY (profile_id, id)
);

CREATE INDEX IF NOT EXISTS sessions_by_date ON sessions (profile_id, date);

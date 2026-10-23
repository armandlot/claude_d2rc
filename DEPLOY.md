# Déployer D2R Run Profit sur Cloudflare Workers

L'application tient dans **un seul Worker**, sur l'offre gratuite :

```
navigateur ──► Cloudflare Workers
                ├── /api/*  → Worker TypeScript (worker/index.ts) ──► D1 (SQLite)
                └── le reste → fichiers statiques de dist/ (PWA)
```

| Élément | Fichier |
| --- | --- |
| Configuration Cloudflare | `wrangler.toml` |
| API (Worker) | `worker/index.ts`, `worker/db.ts`, `worker/model.ts` |
| Schéma de la base | `migrations/0001_init.sql` |
| PWA (manifeste, service worker, icônes) | `public/` |

## Prérequis

- Un compte Cloudflare (gratuit) : <https://dash.cloudflare.com/sign-up>
- Node.js 20 ou plus récent
- Le dépôt cloné en local : `npm install`

## 1. Se connecter à Cloudflare

```bash
npx wrangler login
```

Une page s'ouvre dans le navigateur pour autoriser Wrangler sur votre compte.

## 2. Créer la base D1

```bash
npx wrangler d1 create d2r-run-profit
```

La commande affiche un bloc contenant `database_id = "…"`. Copiez cet identifiant
dans `wrangler.toml`, à la place de `00000000-0000-0000-0000-000000000000` :

```toml
[[d1_databases]]
binding = "DB"
database_name = "d2r-run-profit"
database_id = "l-identifiant-affiché"   # ← ici
migrations_dir = "migrations"
```

Puis créez les tables dans la base en ligne :

```bash
npm run db:migrate:remote
```

Commitez et poussez la modification de `wrangler.toml`.

> L'identifiant D1 n'est pas un secret : il ne donne accès à rien sans votre compte.

## 3. Brancher le dépôt GitHub (déploiement automatique)

1. Dans le tableau de bord Cloudflare : **Workers & Pages** → **Create** →
   **Import a repository** (onglet *Workers*).
2. Connectez votre compte GitHub et choisissez le dépôt `claude_d2rc`.
3. Réglages du projet :

   | Champ | Valeur |
   | --- | --- |
   | Project name | `d2r-run-profit` (doit être identique à `name` dans `wrangler.toml`) |
   | Production branch | `main` (ou la branche que vous déployez) |
   | Build command | `npm run build` |
   | Deploy command | `npx wrangler d1 migrations apply DB --remote && npx wrangler deploy` |
   | Root directory | `/` |

4. **Save and Deploy**.

À chaque push sur la branche de production, Cloudflare construit l'application,
applique les nouvelles migrations D1 puis déploie. L'adresse du site s'affiche à la
fin du premier déploiement : `https://d2r-run-profit.<votre-sous-domaine>.workers.dev`.

> Si la commande de migration échoue pendant le déploiement (droits du jeton de
> build sur D1), remplacez la *Deploy command* par `npx wrangler deploy` et lancez
> `npm run db:migrate:remote` depuis votre poste à chaque nouvelle migration.

### Sans Git : déployer depuis son poste

```bash
npm run deploy   # build + migrations D1 distantes + wrangler deploy
```

## 4. Vérifier

- `https://<votre-worker>.workers.dev/api/health` répond `{"ok":true}`.
- Dans l'application, le badge sous les onglets passe à **« Synchronisé »**.
- Sur téléphone : menu du navigateur → **Ajouter à l'écran d'accueil** pour installer la PWA.

## Développement local

Tout fonctionne sans compte Cloudflare, avec une base D1 locale (fichier SQLite
dans `.wrangler/`, ignoré par git).

```bash
npm run worker:dev        # build + migrations locales + wrangler dev → http://localhost:8787
```

Pour travailler sur l'interface avec rechargement à chaud, lancez en parallèle :

```bash
npx wrangler dev          # API locale sur :8787 (après un premier `npm run worker:dev`)
npm run dev               # Vite sur :5173, qui relaie /api vers :8787
```

Commandes utiles :

```bash
npm test                                   # tests (application + Worker)
npm run db:migrate:local                   # appliquer les migrations à la base locale
npx wrangler d1 execute DB --local --command "SELECT COUNT(*) FROM sessions"
npx wrangler tail                          # journaux du Worker en production
```

## Ajouter une migration

```bash
npx wrangler d1 migrations create DB description_courte   # crée migrations/0002_description_courte.sql
npm run db:migrate:local                                  # tester en local
git commit … && git push                                  # appliquée au prochain déploiement
```

Les champs qui évoluent souvent (compteurs de drops, objets identifiés) sont stockés
en JSON : ajouter une catégorie de drop ne demande pas de migration.

## Données et sécurité

- **Pas de compte** : chaque appareil reçoit une **clé de profil** aléatoire (192 bits),
  envoyée dans l'en-tête `X-Profile-Key`. La base ne stocke que son empreinte SHA-256.
- Pour retrouver ses données sur un autre appareil : badge de synchronisation →
  **Copier** la clé, puis sur l'autre appareil **Utiliser cette clé**.
- Qui possède la clé peut lire et modifier les données du profil : ne la partagez pas.
- L'application reste utilisable hors ligne ; les modifications partent au retour du réseau.
  En cas de modifications sur deux appareils à la fois, la plus récente l'emporte.

## Limites de l'offre gratuite

| Ressource | Limite gratuite | Usage de l'application |
| --- | --- | --- |
| Requêtes Worker | 100 000 / jour | seules les requêtes `/api/*` comptent (les fichiers statiques sont gratuits) |
| D1 : lignes lues | 5 millions / jour | une synchronisation relit le profil (quelques centaines de lignes) |
| D1 : lignes écrites | 100 000 / jour | seules les lignes modifiées sont réécrites |
| D1 : stockage | 5 Go | une session ≈ 0,5 Ko |

## API

| Méthode | Route | Rôle |
| --- | --- | --- |
| `GET` | `/api/health` | état du Worker |
| `GET` | `/api/data` | données du profil (`{"exists": false}` si vide) |
| `PUT` | `/api/data` | remplace les données du profil (`{characters, customRoutes, sessions}`), écriture différentielle |
| `DELETE` | `/api/data` | supprime le profil et ses données |

Toutes les routes `/api/data` exigent l'en-tête `X-Profile-Key`.

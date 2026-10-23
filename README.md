# D2R Run Counter

Application web pour les joueurs de **Diablo II: Resurrected** : elle compare vos
routes de farm (Mephisto, Chaos Sanctuary, Pit, Cows…) en comptant les
**objets uniques, sets et runes obtenus par heure**, avant identification et
quelle que soit leur valeur.

## Fonctionnalités

- **Session** : chronomètre de session et du run en cours, gros boutons
  « Terminer le run » (protégé contre les doubles clics), « Unique », « Set » et un
  bouton par groupe de runes, annulation de la dernière action, pause,
  raccourcis clavier. Taux par heure en direct.
- **Personnages** : créez vos personnages (classe, spécialisation, Magic Find,
  Ladder / Non-ladder, Softcore / Hardcore, nom en jeu). Chaque session leur
  est rattachée.
- **Routes** : créez vos routes custom en enchaînant des boss ou zones dans
  une même partie (ex. Pindleskin → Mephisto → Summoner → Andariel), avec un
  nom facultatif. Elles se comparent aux routes classiques.
- **Comparaison** : classement des combinaisons personnage + route (uniques/h,
  sets/h, runes/h par groupe), indicateur de fiabilité, et un **verdict** en
  toutes lettres, par exemple : « Avec ta Sorcière Météorb, le clear des Terror
  Zones est plus efficace que les runs Chaos avec ton Paladin Marteau », avec
  un test statistique qui dit si l'écart est significatif.
- **Objets identifiés et prix** : entre deux runs ou à la fin d'une session
  (revue automatique), saisissez le nom de chaque objet identifié, **en
  français** (traduit automatiquement, ex. « Cimier Arlequin » → Harlequin
  Crest) ou en anglais ;
  l'application génère un lien vers les échanges vérifiés récents sur
  **Traderie**, filtré sur le mode (Softcore/Hardcore) et le royaume
  (Ladder/Non-ladder) du personnage. La valeur relevée se note à côté.
- **Mode maintenance** (case à cocher) : onglet pour explorer les sessions
  enregistrées (filtres personnage / route), les corriger ou les supprimer, et
  abandonner une session en cours restée bloquée.
- **Aide** : mode d'emploi, raccourcis et groupes de runes.

Groupes de runes (Ladder) :

| Groupe | Runes |
| --- | --- |
| Low rune | El, Eld, Tir, Nef, Eth, Ith, Tal, Ral, Ort, Thul, Amn |
| Mid rune | Sol, Shael, Dol, Hel, Io, Lum, Ko, Fal, Lem, Pul, Um |
| Low HR | Mal, Ist, Gul |
| Mid HR | Vex, Ohm, Lo |
| High HR | Sur, Ber, Jah, Cham, Zod |

Déployée sur **Cloudflare Workers**, l'application est une **PWA** installable,
utilisable hors ligne, dont les données sont sauvegardées dans **Cloudflare D1** et
partagées entre appareils avec « Se connecter avec Google » (identifiant anonyme
seulement : ni e-mail, ni nom, ni mot de passe). Sans serveur
(ex. GitHub Pages), elle fonctionne entièrement dans le navigateur.

## Démarrer en local

```bash
npm install
npm run worker:dev   # application + API + base D1 locale → http://localhost:8787
npm test             # tests (application et Worker)
```

Interface seule, avec rechargement à chaud : `npm run dev` (http://localhost:5173).

## Structure

```
src/              # application React (PWA)
  data/           # classes et spés, routes, étapes, catégories de drops, noms d'objets
  lib/            # statistiques, personnages, routes, verdicts, synchronisation (testés)
  components/     # onglets
public/           # manifeste PWA, service worker, icônes
worker/           # API Cloudflare Worker (TypeScript) adossée à D1
migrations/       # schéma SQL de la base D1
wrangler.toml     # configuration Cloudflare
DEPLOY.md         # brancher le dépôt à Cloudflare
docs/DESIGN.md    # démarche de conception
```

## Mise en ligne

**Cloudflare Workers** (offre gratuite) : voir [DEPLOY.md](DEPLOY.md).

Version en ligne : <https://d2r-run-counter.armandlot.workers.dev>, déployée
automatiquement à chaque push sur `main`.

Le workflow GitHub Pages reste disponible (déclenchement manuel) pour une version
statique sans synchronisation.

---

Projet communautaire non officiel. Diablo® II: Resurrected est une marque de
Blizzard Entertainment.

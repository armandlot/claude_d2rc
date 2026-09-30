# D2R Run Profit

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

Les données restent dans le navigateur (localStorage) ; aucun serveur, aucun compte.

## Démarrer en local

```bash
npm install
npm run dev      # http://localhost:5173/claude_d2rc/
npm test         # tests des statistiques
npm run build    # build de production dans dist/
```

## Structure

```
src/
  data/           # classes et spés, routes, étapes, catégories de drops
  lib/            # statistiques, personnages, routes custom, verdicts (purs, testés) + persistance
  components/     # onglets Session, Comparaison, Personnages, Routes, Aide
.github/workflows # CI (tests + build) et déploiement GitHub Pages
docs/DESIGN.md    # démarche de conception
```

## Mise en ligne

Déploiement automatique sur **GitHub Pages** à chaque push sur `main`
(voir [docs/DESIGN.md](docs/DESIGN.md#6-mise-en-ligne)).

---

Projet communautaire non officiel. Diablo® II: Resurrected est une marque de
Blizzard Entertainment.

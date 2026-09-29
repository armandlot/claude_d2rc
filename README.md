# D2R Run Profit

Application web pour les joueurs de **Diablo II: Resurrected** : elle compare vos
routes de farm (Mephisto, Chaos Sanctuary, Pit, Cows…) en comptant les
**objets uniques, sets et runes obtenus par heure**, avant identification et
quelle que soit leur valeur.

## Fonctionnalités

- **Session** : chronomètre, gros boutons « +1 run », « Unique », « Set » et un
  bouton par groupe de runes, annulation de la dernière action, pause,
  raccourcis clavier. Taux par heure en direct.
- **Comparaison** : classement de vos routes par personnage (uniques/h,
  sets/h, runes/h par groupe), avec un indicateur de fiabilité statistique.
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
  data/           # personnages, routes, catégories de drops
  lib/            # statistiques (pur, testé) + persistance
  components/     # onglets Session, Comparaison, Aide
.github/workflows # CI (tests + build) et déploiement GitHub Pages
docs/DESIGN.md    # démarche de conception
```

## Mise en ligne

Déploiement automatique sur **GitHub Pages** à chaque push sur `main`
(voir [docs/DESIGN.md](docs/DESIGN.md#6-mise-en-ligne)).

---

Projet communautaire non officiel. Diablo® II: Resurrected est une marque de
Blizzard Entertainment.

# D2R Run Profit

Application web pour les joueurs de **Diablo II: Resurrected** : elle estime la
rentabilité d'une route de farm (Mephisto, Chaos Sanctuary, Cows, Comtesse…)
selon le **personnage** choisi, sa **Magic Find**, le paramètre **/players** et
la présence d'**Enigma**. La valeur est exprimée en **runes Ist par heure**.

## Fonctionnalités

- **Simulateur** : classement des routes par Ist/heure pour votre build,
  détail des objets qui contribuent à la valeur, saisie de votre propre temps de run.
- **Session** : chronomètre de farm, compteur de runs, journal des objets
  trouvés, Ist/heure réel comparé à l'estimation, historique.
- **Prix** : table de prix modifiable (ladder, non-ladder…).
- **Méthode** : explication des formules.

Les données sont enregistrées dans le navigateur (localStorage) ; aucun serveur.

## Démarrer en local

```bash
npm install
npm run dev      # http://localhost:5173/claude_d2rc/
npm test         # tests du moteur de calcul
npm run build    # build de production dans dist/
```

## Structure

```
src/
  data/           # builds, routes, objets (données éditables)
  lib/            # moteur de calcul (pur, testé) + persistance
  components/     # onglets de l'interface
.github/workflows # CI (tests + build) et déploiement GitHub Pages
docs/DESIGN.md    # démarche de conception
```

## Mise en ligne

Déploiement automatique sur **GitHub Pages** à chaque push sur `main`
(voir [docs/DESIGN.md](docs/DESIGN.md#6-mise-en-ligne)).

## Contribuer aux données

Les chances de drop de `src/data/routes.ts` sont des ordres de grandeur.
Les corrections (avec source ou résultats de sessions) sont bienvenues via une
pull request.

---

Projet communautaire non officiel. Diablo® II: Resurrected est une marque de
Blizzard Entertainment.

# Conception de D2R Run Profit

Ce document retrace la démarche, de l'idée à la mise en ligne.

## 1. Le problème

Un joueur de D2R qui farme se demande : *« avec mon personnage, quelle route
me rapporte le plus par heure de jeu ? »*. La réponse dépend de :

| Facteur | Effet |
| --- | --- |
| Route | butin possible (niveau de zone, boss), durée du run |
| Build | vitesse de nettoyage, types de dégâts vs immunités, téléportation |
| Magic Find | chances d'uniques / sets / rares (rendements décroissants) |
| /players | plus de drops, mais monstres plus résistants |

## 2. Utilisateurs et cas d'usage

1. **Mesurer une session réelle** : chronométrer, compter uniques, sets et runes sans quitter le jeu des yeux.
2. **Comparer ses routes et ses personnages** : « Terror Zones avec ma Sorcière Météorb, ou Chaos avec mon Paladin Marteau ? »
3. **Savoir quand conclure** : l'indicateur de fiabilité dit si l'écart observé est significatif.

## 3. Modèle de mesure (v2)

La v1 estimait une valeur en runes Ist par heure à partir de chances de drop et
de prix. Après un premier test en jeu, on a simplifié : **on mesure, on n'estime
plus**.

- Le joueur compte ce qui tombe, avant identification : uniques, sets, et
  runes réparties en 5 groupes (Low, Mid, Low HR, Mid HR, High HR).
- Uniques et sets sont séparés : la Magic Find ne les affecte pas de la même façon.
- Taux horaire = nombre de drops ÷ temps de jeu hors pause × 3 600.
- Les sessions d'un même personnage sur une même route sont cumulées.
- Les drops suivant une loi de Poisson, l'incertitude relative vaut ~1/√n :
  une route est « fiable » à partir de 30 uniques + sets observés,
  « indicative » de 10 à 29, « trop peu » en dessous.
- La MF et /players sont enregistrés avec chaque session pour comparer à
  conditions égales.

### Personnages et verdict (v3)

- Un personnage = classe + spécialisation + Magic Find + royaume (Ladder ou
  Non-ladder) + mode (Softcore ou Hardcore), et un nom en jeu facultatif.
  Par défaut : Ladder Softcore ; le mode n'apparaît dans le libellé (« NL »,
  « HC ») que s'il diffère de ce défaut.
  La MF saisie au lancement d'une session met à jour celle du personnage.
- Le verdict compare deux combinaisons personnage + route sur le critère choisi.
  Par défaut : la meilleure contre le meilleur résultat d'un **autre** personnage.
- Significativité : test z sur deux taux de Poisson,
  z = (rA − rB) / √(nA/hA² + nB/hB²), écart significatif si |z| ≥ 1,96 (95 %).
- Les sessions v2, liées à un build, sont reprises automatiquement : un
  personnage est créé par build rencontré.

### Routes custom (v4)

- Une route custom = une suite ordonnée d'étapes (boss ou zones, catalogue
  `src/data/stops.ts`) faites dans la même partie, et un nom facultatif (par
  défaut « Pindleskin → Mephisto → Summoner → Andariel »).
- Un run = une partie complète : le joueur clique « +1 run » après la dernière étape.
- Elle se compare aux routes classiques partout (Session, Comparaison, Verdict :
  « la route « Tour MF » est plus efficace que les runs Chaos »).
- Supprimer une route supprime ses sessions (après confirmation).

Les statistiques (`src/lib/stats.ts`), personnages (`characters.ts`), routes
custom (`customRoutes.ts`) et verdicts (`verdict.ts`) sont des fonctions pures, couvertes par des tests.

## 4. Choix techniques

| Besoin | Choix | Pourquoi |
| --- | --- | --- |
| Interface | React + TypeScript | écosystème riche, typage des données de jeu |
| Outillage | Vite | démarrage instantané, build statique |
| Tests | Vitest | intégré à Vite |
| Données | fichiers TS versionnés | contributions par pull request, pas de base de données |
| Persistance | localStorage | aucun compte ni serveur à maintenir |
| Hébergement | GitHub Pages | gratuit, HTTPS, déployé par GitHub Actions |

## 5. Feuille de route

- [x] v1 : simulateur de valeur en Ist/heure (abandonné après test)
- [x] v2 : comptage uniques / sets / runes par heure, comparaison des routes
- [x] v3 : personnages (classe, spé, MF) et verdict entre personnages
- [x] v4 : routes custom (enchaînement d'étapes dans une partie)
- [ ] Détail par étape d'une route custom (quel boss a lâché quoi)
- [ ] Export / import des sessions (JSON) pour les partager
- [ ] Graphique d'évolution par session
- [ ] Bouton « unique élite » (base visible avant identification)
- [ ] Statistiques communautaires agrégées (nécessiterait un back-end)
- [ ] Traduction anglaise

## 6. Mise en ligne

1. Sur GitHub : **Settings → Pages → Build and deployment → Source : GitHub Actions**.
2. Fusionner le travail dans la branche `main` (pull request).
3. Le workflow `Déploiement GitHub Pages` construit et publie le site sur
   `https://<utilisateur>.github.io/<dépôt>/`.
4. Le chemin de base est calculé automatiquement depuis le nom du dépôt ;
   pour un domaine personnalisé, définir `BASE_PATH=/` dans le workflow.

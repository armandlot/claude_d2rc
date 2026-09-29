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
2. **Comparer ses routes** : « Avec ma Blizzard Sorc à 400 MF, Pit ou Mephisto ? »
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

Les statistiques (`src/lib/stats.ts`) sont des fonctions pures, couvertes par des tests.

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

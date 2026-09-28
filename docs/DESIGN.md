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
| Prix du marché | valeur réelle de ce qui tombe |

## 2. Utilisateurs et cas d'usage

1. **Choisir une route** : « J'ai une Blizzard Sorc à 400 MF, où aller ? »
2. **Mesurer une session réelle** : chronométrer, noter le butin, obtenir l'Ist/heure réel.
3. **Adapter au marché** : ajuster les prix de son royaume.

## 3. Modèle de calcul

```
temps_run   = temps_référence / (vitesse_build × affinité_route)
              × (1 + dépendance_téléport)   si pas de téléportation
              × (1 + 1,5 × part_immunisée)
              × facteur_players
runs/heure  = 3600 / (temps_run + temps_création_partie)
valeur/run  = Σ chance_objet × multiplicateur_MF × facteur_players × part_tuée × prix
Ist/heure   = valeur/run × runs/heure
```

- *part_immunisée* : produit des immunités de la route pour chaque type de
  dégâts du build (un monstre ne bloque que s'il résiste à tout).
- *multiplicateur MF* : formules officielles (uniques 250, sets 500, rares 600).
- Le temps saisi par le joueur remplace toujours l'estimation.

Le moteur (`src/lib/profitability.ts`) est une fonction pure, couverte par des tests.

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

- [x] MVP : simulateur, session, prix, méthode
- [ ] Export / import des sessions (JSON) pour les partager
- [ ] Plus de routes (Nihlathak, Eldritch/Shenk, Terror Zones) et de builds
- [ ] Mode « comparaison de deux builds »
- [ ] Statistiques communautaires agrégées (nécessiterait un back-end)
- [ ] Traduction anglaise

## 6. Mise en ligne

1. Sur GitHub : **Settings → Pages → Build and deployment → Source : GitHub Actions**.
2. Fusionner le travail dans la branche `main` (pull request).
3. Le workflow `Déploiement GitHub Pages` construit et publie le site sur
   `https://<utilisateur>.github.io/<dépôt>/`.
4. Le chemin de base est calculé automatiquement depuis le nom du dépôt ;
   pour un domaine personnalisé, définir `BASE_PATH=/` dans le workflow.

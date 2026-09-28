export default function Method() {
  return (
    <section className="panel prose">
      <h2>Comment sont calculées les estimations ?</h2>
      <p>
        La rentabilité d'une route est sa <strong>valeur espérée par heure</strong> :
      </p>
      <pre>Ist/heure = (Σ chance × prix de chaque objet) × runs par heure</pre>

      <h3>Durée d'un run</h3>
      <ul>
        <li>Chaque route a un temps de référence pour un build bien équipé.</li>
        <li>Il est divisé par la vitesse du build (et son affinité avec la route).</li>
        <li>Sans téléportation (ni Enigma), les trajets s'allongent selon la route.</li>
        <li>
          Les monstres immunisés à <em>tous</em> vos types de dégâts ralentissent le run et, en zone, leur butin est en
          partie perdu.
        </li>
        <li>On ajoute le temps de création de partie pour obtenir le nombre de runs par heure.</li>
      </ul>

      <h3>Chances de butin</h3>
      <ul>
        <li>Les chances de référence sont données pour 300 % de MF en joueurs 1.</li>
        <li>
          La MF suit les rendements décroissants du jeu : uniques ×250/(MF+250), sets ×500/(MF+500), rares
          ×600/(MF+600). Les runes et objets « autres » n'en profitent pas.
        </li>
        <li>Le paramètre /players augmente les drops (moins de « NoDrop ») mais aussi la durée des combats.</li>
      </ul>

      <h3>Limites</h3>
      <p>
        Les chances sont des <strong>ordres de grandeur communautaires</strong>, pas des tables de drop exactes. Pour
        des chiffres fiables, utilisez l'onglet <em>Session</em> : chronométrez vos runs, notez vos trouvailles et
        reportez votre temps moyen dans le simulateur.
      </p>
    </section>
  );
}

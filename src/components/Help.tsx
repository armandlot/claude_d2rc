import { DROP_CATEGORIES } from "../data/drops";

export default function Help() {
  return (
    <section className="panel prose">
      <h2>Comment ça marche</h2>
      <p>
        L'application compare vos routes sur un critère simple : <strong>combien d'objets tombent par heure</strong>,
        quelle que soit leur valeur. On compte les objets <span className="q-unique">uniques</span> et{" "}
        <span className="q-set">sets</span> dès qu'ils tombent, avant identification, et les runes par groupe.
      </p>

      <h3>Vos personnages</h3>
      <p>
        Dans l'onglet Personnages, créez chaque personnage que vous farmez : classe, spécialisation et Magic Find. Toutes
        les sessions lui sont rattachées, ce qui permet de comparer vos personnages entre eux.
      </p>

      <h3>Routes custom</h3>
      <p>
        Dans l'onglet Routes, enchaînez plusieurs boss ou zones faits dans la même partie, par exemple Pindleskin →
        Mephisto → Summoner → Andariel. La route apparaît ensuite dans la Session et la Comparaison, face aux routes
        classiques. Un run = une partie complète : cliquez « +1 run » une seule fois, après la dernière étape.
      </p>

      <h3>Pendant le farm</h3>
      <ol>
        <li>
          Onglet Session : choisissez le personnage, la route et /players, puis « Démarrer le chrono ». Si votre MF a
          changé, corrigez-la : elle sera mise à jour sur le personnage.
        </li>
        <li>À la fin de chaque partie : « +1 run ».</li>
        <li>À chaque drop : le bouton correspondant. Une erreur ? « Annuler ».</li>
        <li>Une pause (pipi, commerce) : « Pause ». Le temps en pause n'est pas compté.</li>
        <li>À la fin : « Terminer et enregistrer ».</li>
      </ol>

      <h3>Raccourcis clavier</h3>
      <p>Quand la page a le focus (second écran, fenêtre à côté du jeu) :</p>
      <ul className="keys">
        <li>
          <kbd>R</kbd> +1 run
        </li>
        {DROP_CATEGORIES.map((c) => (
          <li key={c.kind}>
            <kbd>{c.key.toUpperCase()}</kbd> {c.label}
          </li>
        ))}
        <li>
          <kbd>Z</kbd> annuler la dernière action
        </li>
        <li>
          <kbd>P</kbd> pause / reprise
        </li>
      </ul>

      <h3>Groupes de runes (Ladder)</h3>
      <table>
        <tbody>
          {DROP_CATEGORIES.filter((c) => c.runes.length).map((c) => (
            <tr key={c.kind}>
              <th className="q-rune">{c.label}</th>
              <td>{c.runes.join(", ")}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Charmes</h3>
      <p>
        Les boutons Small, Large et Grand charm comptent les charmes <span className="q-magic">magiques</span> (bleus).
        Les charmes uniques (Gheed's Fortune, Annihilus, Hellfire Torch) sont dorés : comptez-les avec « Unique ».
      </p>

      <h3>Lire la comparaison</h3>
      <ul>
        <li>Chaque taux = nombre de drops ÷ temps de jeu hors pause × 3 600.</li>
        <li>Les sessions d'un même personnage sur une même route sont cumulées.</li>
        <li>
          Le verdict compare les deux meilleures combinaisons personnage + route, ou deux combinaisons que vous
          choisissez. Il précise si l'écart est significatif (test statistique à 95 %) ou s'il peut encore venir du
          hasard.
        </li>
        <li>
          Les drops sont très aléatoires. La fiabilité se base sur le nombre d'uniques + sets observés : « trop peu »
          sous 10, « indicatif » de 10 à 29, « fiable » à partir de 30.
        </li>
        <li>Comparez des sessions à Magic Find proche : la MF change fortement le nombre d'uniques et de sets.</li>
      </ul>
    </section>
  );
}

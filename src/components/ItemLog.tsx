import { useState } from "react";
import { ITEM_NAMES } from "../data/itemCatalog";
import type { Character } from "../lib/characters";
import type { IdentifiedItem } from "../lib/stats";
import { traderieUrl } from "../lib/traderie";

interface Props {
  items: IdentifiedItem[];
  onChange: (items: IdentifiedItem[]) => void;
  /** Personnage de la session : son mode et son royaume filtrent Traderie. */
  character?: Character;
  /** Identifiant unique du champ (plusieurs listes peuvent coexister). */
  inputId: string;
}

export default function ItemLog({ items, onChange, character, inputId }: Props) {
  const [name, setName] = useState("");
  const realm = character ?? { ladder: true, hardcore: false };

  const add = () => {
    const clean = name.trim();
    if (!clean) return;
    onChange([...items, { id: `i${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, name: clean, value: "" }]);
    setName("");
  };

  return (
    <div className="item-log">
      <form
        className="add-item"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <label htmlFor={inputId} className="sr-only">
          Nom de l'objet identifié
        </label>
        <input
          id={inputId}
          list="item-names"
          value={name}
          autoComplete="off"
          placeholder="Nom anglais de l'objet, ex. Harlequin Crest"
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" className="primary" disabled={!name.trim()}>
          Ajouter
        </button>
        <datalist id="item-names">
          {ITEM_NAMES.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
      </form>

      {items.length > 0 && (
        <ul className="items">
          {items.map((item) => (
            <li key={item.id}>
              <span className="item-name">{item.name}</span>
              <a className="traderie" href={traderieUrl(item.name, realm)} target="_blank" rel="noopener noreferrer">
                Prix Traderie ↗
              </a>
              <input
                className="item-value"
                aria-label={`Valeur de ${item.name}`}
                placeholder="Valeur (ex. 2 Ist)"
                value={item.value}
                maxLength={30}
                onChange={(e) => onChange(items.map((x) => (x.id === item.id ? { ...x, value: e.target.value } : x)))}
              />
              <button
                type="button"
                className="icon"
                aria-label={`Retirer ${item.name}`}
                onClick={() => onChange(items.filter((x) => x.id !== item.id))}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="hint">
        Traderie s'ouvre sur les échanges vérifiés récents, filtrés {realm.ladder ? "Ladder" : "Non-ladder"}{" "}
        {realm.hardcore ? "Hardcore" : "Softcore"} comme le personnage. Utilisez le nom anglais du jeu.
      </p>
    </div>
  );
}

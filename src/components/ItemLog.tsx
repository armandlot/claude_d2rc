import { useState } from "react";
import { ITEM_NAMES_FR_EN } from "../data/itemNames";
import { isPartialName, resolveItemName } from "../lib/itemTranslate";
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

  const preview = name.trim() ? resolveItemName(name) : null;

  const add = () => {
    if (!preview) return;
    onChange([
      ...items,
      {
        id: `i${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
        name: preview.english,
        nameFr: preview.french,
        known: preview.known,
        value: "",
      },
    ]);
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
          placeholder="Nom de l'objet en jeu, ex. Cimier Arlequin"
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" className="primary" disabled={!name.trim()}>
          Ajouter
        </button>
        <datalist id="item-names">
          {ITEM_NAMES_FR_EN.map(([fr, en]) => (
            <option key={fr} value={fr} label={en} />
          ))}
        </datalist>
      </form>
      {preview && (
        <p
          className={preview.known ? "translation" : isPartialName(name) ? "translation pending" : "translation unknown"}
          aria-live="polite"
        >
          {preview.known
            ? preview.french
              ? `→ ${preview.english} (nom anglais pour Traderie)`
              : `→ ${preview.english}`
            : isPartialName(name)
              ? "Continuez la saisie ou choisissez un nom dans la liste."
              : "Nom non reconnu : le lien Traderie utilisera le texte tel quel. Vérifiez l'orthographe du jeu."}
        </p>
      )}

      {items.length > 0 && (
        <ul className="items">
          {items.map((item) => (
            <li key={item.id}>
              <span className="item-name">
                {item.nameFr ?? item.name}
                {item.nameFr && <small className="item-en">{item.name}</small>}
                {item.known === false && <small className="item-unknown">nom non reconnu</small>}
              </span>
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
        {realm.hardcore ? "Hardcore" : "Softcore"} comme le personnage. Saisissez le nom en français (ou en anglais) : il est traduit
        automatiquement.
      </p>
    </div>
  );
}

import { ITEMS } from "../data/items";
import type { PriceTable } from "../lib/profitability";

interface Props {
  prices: PriceTable;
  onChange: (prices: PriceTable) => void;
}

export default function Prices({ prices, onChange }: Props) {
  const setPrice = (id: string, value: number | null) => {
    const next = { ...prices };
    if (value === null || Number.isNaN(value)) delete next[id];
    else next[id] = value;
    onChange(next);
  };

  return (
    <section className="panel">
      <h2>Prix du marché</h2>
      <p className="hint">
        Toutes les valeurs sont exprimées en <strong>runes Ist</strong>. Adaptez-les à votre royaume (ladder, non-ladder,
        hardcore). Les modifications sont enregistrées dans votre navigateur.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Objet</th>
              <th className="num">Défaut</th>
              <th className="num">Votre prix</th>
            </tr>
          </thead>
          <tbody>
            {ITEMS.map((item) => (
              <tr key={item.id}>
                <td>
                  <span className={`q-${item.quality}`}>{item.name}</span>
                </td>
                <td className="num">{item.defaultValue}</td>
                <td className="num">
                  <input
                    type="number"
                    min={0}
                    step={0.05}
                    aria-label={`Prix de ${item.name}`}
                    placeholder={String(item.defaultValue)}
                    value={prices[item.id] ?? ""}
                    onChange={(e) => setPrice(item.id, e.target.value === "" ? null : Number(e.target.value))}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="secondary" onClick={() => onChange({})} disabled={Object.keys(prices).length === 0}>
        Réinitialiser les prix
      </button>
    </section>
  );
}

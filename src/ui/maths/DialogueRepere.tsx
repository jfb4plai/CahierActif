import { useState } from 'react';
import { lireBorne, parametresValides, type ParamsRepere } from '../../maths/repere';

type Props = { onValider: (p: ParamsRepere) => void; onAnnuler: () => void };

type Cle = 'xmin' | 'xmax' | 'ymin' | 'ymax';

const CHAMPS: { cle: Cle; label: string; aide: string }[] = [
  { cle: 'xmin', label: 'x minimum', aide: 'Plus petite valeur sur l’axe horizontal (0 ou négative). Exemple : −5.' },
  { cle: 'xmax', label: 'x maximum', aide: 'Plus grande valeur sur l’axe horizontal (0 ou positive). Exemple : 5.' },
  { cle: 'ymin', label: 'y minimum', aide: 'Plus petite valeur sur l’axe vertical. Exemple : −5.' },
  { cle: 'ymax', label: 'y maximum', aide: 'Plus grande valeur sur l’axe vertical. Exemple : 5.' },
];

export function DialogueRepere({ onValider, onAnnuler }: Props) {
  // Texte saisi tel quel : un champ vide ou « - » en cours de frappe ne doit pas redevenir 0.
  const [bornes, setBornes] = useState<Record<Cle, string>>({ xmin: '-5', xmax: '5', ymin: '-5', ymax: '5' });
  const [uniteMm, setUniteMm] = useState(10);
  const p: ParamsRepere = { xmin: lireBorne(bornes.xmin), xmax: lireBorne(bornes.xmax), ymin: lireBorne(bornes.ymin), ymax: lireBorne(bornes.ymax), uniteMm };
  const erreur = parametresValides(p);
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 p-4" role="dialog" aria-modal="true" aria-labelledby="titre-rep">
      <div className="plai-card max-h-[90vh] w-full max-w-md overflow-auto bg-[var(--surface)] p-5 text-base">
        <h2 id="titre-rep" className="mb-3 font-serif text-2xl">Poser un repère</h2>
        <div className="grid grid-cols-2 gap-3">
          {CHAMPS.map(c => (
            <div key={c.cle}>
              <label htmlFor={`rep-${c.cle}`} className="block font-semibold">{c.label}</label>
              <input id={`rep-${c.cle}`} type="text" inputMode="text" autoComplete="off" className="plai-input min-h-[44px] w-full !text-base" placeholder="ex. -5"
                value={bornes[c.cle]} onChange={e => setBornes({ ...bornes, [c.cle]: e.target.value })} />
              <p className="text-[var(--text2)]">{c.aide}</p>
            </div>
          ))}
        </div>
        <label htmlFor="rep-unite" className="mt-3 block font-semibold">Unité</label>
        <select id="rep-unite" className="plai-input min-h-[44px] !text-base" value={uniteMm} onChange={e => setUniteMm(Number(e.target.value))}>
          <option value={5}>5 mm (petit repère)</option>
          <option value={10}>1 cm</option>
          <option value={20}>2 cm (grand repère)</option>
        </select>
        <p className="mb-3 text-[var(--text2)]">Distance entre deux graduations. Plus l’unité est grande, plus il est facile de placer les points.</p>
        {erreur && <div className="plai-error mb-3 !text-base" role="alert">{erreur}</div>}
        <div className="flex gap-2">
          <button type="button" className="plai-btn min-h-[44px] !text-base" disabled={!!erreur} onClick={() => onValider(p)}>Poser le repère</button>
          <button type="button" className="plai-btn min-h-[44px] !text-base" onClick={onAnnuler}>Annuler</button>
        </div>
      </div>
    </div>
  );
}

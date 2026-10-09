import { useState } from 'react';
import { parametresValides, type ParamsRepere } from '../../maths/repere';

type Props = { onValider: (p: ParamsRepere) => void; onAnnuler: () => void };

const CHAMPS: { cle: 'xmin' | 'xmax' | 'ymin' | 'ymax'; label: string; aide: string }[] = [
  { cle: 'xmin', label: 'x minimum', aide: 'Plus petite valeur sur l’axe horizontal (0 ou négative). Exemple : −5.' },
  { cle: 'xmax', label: 'x maximum', aide: 'Plus grande valeur sur l’axe horizontal (0 ou positive). Exemple : 5.' },
  { cle: 'ymin', label: 'y minimum', aide: 'Plus petite valeur sur l’axe vertical. Exemple : −5.' },
  { cle: 'ymax', label: 'y maximum', aide: 'Plus grande valeur sur l’axe vertical. Exemple : 5.' },
];

export function DialogueRepere({ onValider, onAnnuler }: Props) {
  const [p, setP] = useState<ParamsRepere>({ xmin: -5, xmax: 5, ymin: -5, ymax: 5, uniteMm: 10 });
  const erreur = parametresValides(p);
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 p-4" role="dialog" aria-modal="true" aria-labelledby="titre-rep">
      <div className="plai-card max-h-[90vh] w-full max-w-md overflow-auto bg-[var(--surface)] p-5">
        <h2 id="titre-rep" className="mb-3 font-serif text-2xl">Poser un repère</h2>
        <div className="grid grid-cols-2 gap-3">
          {CHAMPS.map(c => (
            <div key={c.cle}>
              <label htmlFor={`rep-${c.cle}`} className="block font-semibold">{c.label}</label>
              <input id={`rep-${c.cle}`} type="number" inputMode="numeric" step={1} className="plai-input w-full" placeholder="ex. 5"
                value={p[c.cle]} onChange={e => setP({ ...p, [c.cle]: Number(e.target.value) })} />
              <p className="text-[var(--text2)]">{c.aide}</p>
            </div>
          ))}
        </div>
        <label htmlFor="rep-unite" className="mt-3 block font-semibold">Unité</label>
        <select id="rep-unite" className="plai-input min-h-[44px]" value={p.uniteMm} onChange={e => setP({ ...p, uniteMm: Number(e.target.value) })}>
          <option value={5}>5 mm (petit repère)</option>
          <option value={10}>1 cm</option>
          <option value={20}>2 cm (grand repère)</option>
        </select>
        <p className="mb-3 text-[var(--text2)]">Distance entre deux graduations. Plus l’unité est grande, plus il est facile de placer les points.</p>
        {erreur && <div className="plai-error mb-3" role="alert">{erreur}</div>}
        <div className="flex gap-2">
          <button type="button" className="plai-btn min-h-[44px]" disabled={!!erreur} onClick={() => onValider(p)}>Poser le repère</button>
          <button type="button" className="plai-btn min-h-[44px]" onClick={onAnnuler}>Annuler</button>
        </div>
      </div>
    </div>
  );
}

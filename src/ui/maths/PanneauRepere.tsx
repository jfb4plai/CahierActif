import { useState } from 'react';
import { ajouterDroite, etiquettePoint, nomDroite, supprimerDroite, supprimerPoint } from '../../maths/repere';
import type { Repere } from '../../model/types';

type Props = { o: Repere; onChange: (o: Repere) => void; onFin: (o: Repere) => void };

export function PanneauRepere({ o, onChange, onFin }: Props) {
  const noms = o.points.map(p => p.nom);
  // Par défaut : les deux derniers points placés. Un choix devenu invalide (point supprimé) est remplacé.
  const [choixA, setChoixA] = useState('');
  const [choixB, setChoixB] = useState('');
  const a = noms.includes(choixA) ? choixA : (noms[noms.length - 2] ?? '');
  const b = noms.includes(choixB) && choixB !== a ? choixB : (noms.filter(n => n !== a).pop() ?? '');
  const suivant = ajouterDroite(o, a, b);
  const droiteDejaTracee = suivant === o && !!a && !!b && a !== b;
  const droites = o.droites ?? [];

  return (
    <div role="region" aria-label="Points du repère" className="fixed bottom-4 left-1/2 z-[60] max-h-[70vh] w-[min(92vw,28rem)] -translate-x-1/2 overflow-y-auto rounded-xl bg-[var(--surface)] p-4 text-base shadow-lg">
      <p className="mb-2">Touchez le repère pour placer un point. Il se place sur la demi-unité la plus proche.</p>
      {o.points.length === 0 ? (
        <p className="mb-2 text-[var(--text2)]">Aucun point pour l’instant.</p>
      ) : (
        <ul className="mb-2 flex flex-wrap gap-2">
          {o.points.map(p => (
            <li key={p.nom} className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-2">
              {etiquettePoint(p)}
              <button type="button" className="plai-btn min-h-[44px] !text-base" aria-label={`Supprimer le point ${p.nom}`} onClick={() => onChange(supprimerPoint(o, p.nom))}>Supprimer</button>
            </li>
          ))}
        </ul>
      )}

      {o.points.length >= 2 && (
        <fieldset className="mb-2 rounded-lg border border-[var(--border)] p-2">
          <legend className="px-1 font-semibold">Tracer une droite</legend>
          <div className="flex flex-wrap items-end gap-2">
            <label className="block">
              Premier point
              <select className="plai-input mt-1 block min-h-[44px]" value={a} onChange={e => setChoixA(e.target.value)} aria-describedby="aide-droite">
                {noms.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label className="block">
              Deuxième point
              <select className="plai-input mt-1 block min-h-[44px]" value={b} onChange={e => setChoixB(e.target.value)} aria-describedby="aide-droite">
                {noms.filter(n => n !== a).map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <button type="button" className="plai-btn min-h-[44px] !text-base" disabled={suivant === o} onClick={() => onChange(suivant)}>
              Tracer la droite
            </button>
          </div>
          <p id="aide-droite" className="mt-1 text-[var(--text2)]">
            La droite passe par les deux points choisis et se prolonge jusqu’aux bords du quadrillage.
            {droiteDejaTracee && ' Cette droite est déjà tracée.'}
          </p>
        </fieldset>
      )}
      {droites.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-2">
          {droites.map(d => (
            <li key={`${d.a}${d.b}`} className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-2">
              Droite {nomDroite(d)}
              <button type="button" className="plai-btn min-h-[44px] !text-base" aria-label={`Supprimer la droite ${nomDroite(d)}`} onClick={() => onChange(supprimerDroite(o, d.a, d.b))}>Supprimer</button>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="plai-btn min-h-[44px] !text-base" onClick={() => onFin(o)}>Terminé</button>
    </div>
  );
}

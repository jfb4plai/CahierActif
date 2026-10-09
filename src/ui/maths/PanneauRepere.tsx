import { etiquettePoint, supprimerPoint } from '../../maths/repere';
import type { Repere } from '../../model/types';

type Props = { o: Repere; onChange: (o: Repere) => void; onFin: (o: Repere) => void };

export function PanneauRepere({ o, onChange, onFin }: Props) {
  return (
    <div role="region" aria-label="Points du repère" className="fixed bottom-4 left-1/2 z-[60] w-[min(92vw,28rem)] -translate-x-1/2 rounded-xl bg-[var(--surface)] p-4 text-base shadow-lg">
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
      <button type="button" className="plai-btn min-h-[44px] !text-base" onClick={() => onFin(o)}>Terminé</button>
    </div>
  );
}

import { OUTILS } from '../model/outils';
import type { PropsOutils } from './BarreOutils';
import { ColonneOutils } from './ColonneOutils';
import type { PositionColonne } from '../lib/reglages';
import { usePeek } from './usePeek';

export const LARGEUR_BANDE_PX = 64;

type Props = PropsOutils & {
  position: PositionColonne;
  /** Choix mémorisé : la colonne reste repliée (bande étroite) tant qu'on ne la déplie pas. */
  replie: boolean;
  onBasculer: () => void;
};

/**
 * Colonne d'outils pliable. Dépliée : la colonne entière (bouton « Replier la colonne »).
 * Repliée : une bande étroite (flèche, outil actif, annuler/rétablir). Toucher la flèche la déplie pour de bon ;
 * à la souris, survoler la bande l'affiche par-dessus la page (« Garder déplié » la fixe).
 */
export function ColonneRepliable(p: Props) {
  const { peek, fermer, liens } = usePeek();

  if (!p.replie) {
    return <ColonneOutils {...p} bouton={{ libelle: 'Replier', onClick: p.onBasculer, deplie: true }} />;
  }

  const actif = OUTILS.find(o => o.id === p.outil)?.libelle ?? '';
  const fleche = p.position === 'gauche' ? '▶' : '◀';

  return (
    <div className="sticky top-[64px] z-[55] m-3 self-start" style={{ width: LARGEUR_BANDE_PX }} {...liens}>
      <div className="carte-flottante flex flex-col items-center gap-2 p-2">
        <button type="button" className="plai-btn-secondaire min-h-[44px] w-full !px-0" aria-label="Déplier la colonne d’outils" aria-expanded={false} onClick={p.onBasculer}>
          {fleche}
        </button>
        <span
          className="rounded-xl border-4 border-[#1e3a8a] bg-[#1d4ed8] px-2 py-3 text-base font-bold text-white"
          style={{ writingMode: 'vertical-rl' }}
          aria-label={`Outil choisi : ${actif}`}
        >
          {actif}
        </span>
        <button type="button" className="plai-btn-secondaire min-h-[44px] w-full !px-0" aria-label="Annuler" disabled={!p.peutAnnuler} onClick={p.onAnnuler}>↶</button>
        <button type="button" className="plai-btn-secondaire min-h-[44px] w-full !px-0" aria-label="Rétablir" disabled={!p.peutRetablir} onClick={p.onRetablir}>↷</button>
      </div>
      {peek && (
        <div className={`absolute top-0 ${p.position === 'gauche' ? 'left-0' : 'right-0'}`}>
          <ColonneOutils
            {...p}
            flottante
            bouton={{ libelle: 'Garder déplié', onClick: () => { fermer(); p.onBasculer(); }, deplie: false }}
          />
        </div>
      )}
    </div>
  );
}

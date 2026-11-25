import type { PositionColonne } from '../lib/reglages';
import { groupesPour } from '../model/outils';
import type { PropsOutils } from './BarreOutils';

type Props = PropsOutils & { position: PositionColonne };

export const LARGEUR_COLONNE_PX = 176;

// Outil actif : plein, bleu, texte blanc, bordure épaisse. Tous les autres : gris. Le contraste ne repose pas
// sur la seule couleur (bordure plus épaisse, texte en gras).
const BASE = 'min-h-[52px] w-full rounded-lg px-3 text-left text-lg leading-tight disabled:opacity-40';
export const OUTIL_ACTIF = `${BASE} border-4 border-[#1e3a8a] bg-[#1d4ed8] font-bold text-white`;
export const OUTIL_GRIS = `${BASE} border-2 border-[#d1d5db] bg-[#e5e7eb] text-[#4b5563]`;
// Choix à l'intérieur d'un outil (forme, épaisseur) : contour bleu quand choisi, gris sinon.
export const OPTION_CHOISIE = `${BASE} border-4 border-[#1d4ed8] bg-white font-bold text-[#1d4ed8]`;

/** Colonne des outils, rangés par groupes ; Annuler et Rétablir sont avec les gommes (groupe Corriger). */
export function ColonneOutils(p: Props) {
  return (
    <aside
      role="toolbar"
      aria-label="Outils"
      aria-orientation="vertical"
      className={`sticky top-[52px] z-40 flex shrink-0 flex-col gap-3 self-start overflow-y-auto border-[var(--border)] bg-[var(--surface)] p-2 ${p.position === 'gauche' ? 'border-r' : 'border-l'}`}
      style={{ width: LARGEUR_COLONNE_PX, maxHeight: 'calc(100vh - 52px)' }}
    >
      {groupesPour(p.niveau).map(g => (
        <section key={g.id} aria-labelledby={`groupe-${g.id}`}>
          <h2 id={`groupe-${g.id}`} className="mb-1 text-base font-semibold text-[var(--text2)]">{g.titre}</h2>
          <div className="flex flex-col gap-1.5">
            {g.outils.map(o => (
              <button key={o.id} type="button" className={p.outil === o.id ? OUTIL_ACTIF : OUTIL_GRIS} title={o.aide}
                aria-pressed={p.outil === o.id} onClick={() => p.setOutil(o.id)}>
                {o.libelle}
              </button>
            ))}
            {g.id === 'corriger' && (
              <>
                <button type="button" className={OUTIL_GRIS} disabled={!p.peutAnnuler} onClick={p.onAnnuler}>↶ Annuler</button>
                <button type="button" className={OUTIL_GRIS} disabled={!p.peutRetablir} onClick={p.onRetablir}>↷ Rétablir</button>
              </>
            )}
          </div>
        </section>
      ))}
    </aside>
  );
}

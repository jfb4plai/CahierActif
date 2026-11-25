import { COULEURS_SURLIGNEUR } from '../lib/couleurs';
import { FORMES } from '../model/formes';
import { OUTILS } from '../model/outils';
import { COULEURS, EPAISSEURS, type PropsOutils } from './BarreOutils';
import { OPTION_CHOISIE, OUTIL_GRIS } from './ColonneOutils';

const PUCE = '!w-auto';

/**
 * Bandeau fixe au-dessus de la page : réglages de l'outil choisi (forme, couleur, épaisseur, objet choisi) et zoom.
 * Les réglages passent à la ligne plutôt que de défiler : tout reste visible. La hauteur ne change qu'au choix de l'outil.
 */
export function BandeauReglages(p: PropsOutils) {
  const aide = OUTILS.find(o => o.id === p.outil)?.aide;
  const aDesReglages = p.outil === 'formes' || !!p.selection || !!p.palette || p.montrerEpaisseur;

  return (
    <div className="sticky top-[52px] z-40 flex min-h-[84px] items-center gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-2" role="group" aria-label="Réglages de l’outil">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-6 gap-y-2 py-2">
        {p.outil === 'formes' && (
          <div role="group" aria-label="Forme à tracer" className="flex flex-wrap items-center gap-2">
            {FORMES.map(f => (
              <button key={f.id} type="button" className={`${p.formeChoisie === f.id ? OPTION_CHOISIE : OUTIL_GRIS} ${PUCE}`}
                aria-pressed={p.formeChoisie === f.id} title={`${f.libelle} : glisser sur la page`} onClick={() => p.setFormeChoisie(f.id)}>
                {f.libelle}
              </button>
            ))}
          </div>
        )}
        {p.selection && (
          p.selection.present ? (
            <div role="group" aria-label="Objet choisi" className="flex shrink-0 items-center gap-2">
              {p.selection.modifiable && <button type="button" className={`${OUTIL_GRIS} ${PUCE}`} onClick={p.selection.onModifier}>Modifier</button>}
              <button type="button" className={`${OUTIL_GRIS} ${PUCE}`} onClick={p.selection.onSupprimer}>Supprimer</button>
            </div>
          ) : (
            <p className="shrink-0 text-base text-[var(--text2)]" aria-live="polite">Toucher un objet de la page pour le choisir.</p>
          )
        )}
        {p.palette && (
          <>
            <div role="group" aria-label="Couleur" className="flex shrink-0 items-center gap-2">
              {(p.palette === 'surligneur' ? COULEURS_SURLIGNEUR : COULEURS).map(c => (
                <button key={c.hex} type="button" aria-label={c.nom} title={c.nom} aria-pressed={p.couleur === c.hex} onClick={() => p.setCouleur(c.hex)}
                  className={`h-12 w-12 shrink-0 rounded-full border-4 ${p.couleur === c.hex ? 'border-[#1d4ed8]' : 'border-white'}`}
                  style={{ background: c.hex, boxShadow: '0 0 0 1px #9ca3af' }} />
              ))}
            </div>
          </>
        )}
        {p.montrerEpaisseur && (
          <>
            <div role="group" aria-label="Épaisseur du trait" className="flex shrink-0 items-center gap-2">
              {EPAISSEURS.map(e => (
                <button key={e.mm} type="button" className={`${p.epaisseur === e.mm ? OPTION_CHOISIE : OUTIL_GRIS} ${PUCE}`}
                  aria-pressed={p.epaisseur === e.mm} onClick={() => p.setEpaisseur(e.mm)}>
                  {e.libelle}
                </button>
              ))}
            </div>
          </>
        )}
        {!aDesReglages && aide && <p className="text-base text-[var(--text2)]">{aide}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2" role="group" aria-label="Zoom">
        <button type="button" className={`${OUTIL_GRIS} shrink-0 !w-[52px] !px-0 text-center`} aria-label="Dézoomer"
          onClick={() => p.setZoom(Math.max(0.5, +(p.zoom - 0.25).toFixed(2)))}>−</button>
        <span className="min-w-[3.5rem] text-center text-lg" aria-live="polite">{Math.round(p.zoom * 100)} %</span>
        <button type="button" className={`${OUTIL_GRIS} shrink-0 !w-[52px] !px-0 text-center`} aria-label="Zoomer"
          onClick={() => p.setZoom(Math.min(3, +(p.zoom + 0.25).toFixed(2)))}>+</button>
      </div>
    </div>
  );
}

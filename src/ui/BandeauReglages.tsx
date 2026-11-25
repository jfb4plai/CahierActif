import { COULEURS_SURLIGNEUR, SURLIGNEUR_EPAISSEUR_MAX_MM, SURLIGNEUR_EPAISSEUR_MIN_MM, SURLIGNEUR_EPAISSEUR_PAS_MM, SURLIGNEUR_OPACITE } from '../lib/couleurs';
import { FORMES } from '../model/formes';
import { OUTILS } from '../model/outils';
import { TAILLES_TEXTE_PT } from '../model/texte';
import { COULEURS, EPAISSEURS, type PropsOutils } from './BarreOutils';
import { CONTENEUR_SEGMENTS, OPTION_CHOISIE, OUTIL_GRIS, SEGMENT, SEGMENT_ACTIF } from './ColonneOutils';
import { IconeUi } from './iconesOutils';
import { PaletteCouleurs } from './PaletteCouleurs';

const PUCE = '!w-auto';

/**
 * Bandeau fixe au-dessus de la page : réglages de l'outil choisi (forme, couleur, épaisseur, objet choisi) et zoom.
 * Les réglages passent à la ligne plutôt que de défiler : tout reste visible. La hauteur ne change qu'au choix de l'outil.
 */
export function BandeauReglages(p: PropsOutils) {
  const aide = OUTILS.find(o => o.id === p.outil)?.aide;
  const aDesReglages = p.outil === 'formes' || !!p.selection || !!p.palette || p.montrerEpaisseur || !!p.surligneur || !!p.tailleTexte;

  return (
    <div className="carte-flottante sticky top-[64px] z-40 mx-3 mt-3 flex min-h-[84px] items-center gap-3 px-3" role="group" aria-label="Réglages de l’outil">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-6 gap-y-2 py-2">
        {p.outil === 'droite' && (
          <p className="max-w-[18rem] text-base text-[var(--text2)]">Toucher le premier point, puis le deuxième : la droite passe par les deux. Les points se déplacent ensuite avec Sélectionner.</p>
        )}
        {p.outil === 'formes' && (
          <div role="group" aria-label="Forme à tracer" className={CONTENEUR_SEGMENTS}>
            {FORMES.map(f => (
              <button key={f.id} type="button" className={p.formeChoisie === f.id ? SEGMENT_ACTIF : SEGMENT}
                aria-pressed={p.formeChoisie === f.id} title={`${f.libelle} : glisser sur la page`} onClick={() => p.setFormeChoisie(f.id)}>
                {f.libelle}
              </button>
            ))}
          </div>
        )}
        {p.selection && (
          <div role="group" aria-label="Objets choisis" className="flex flex-wrap items-center gap-2">
            <button type="button" className={`${p.selection.multiple ? OPTION_CHOISIE : OUTIL_GRIS} ${PUCE}`} aria-pressed={p.selection.multiple}
              title="Quand c’est activé, toucher un objet l’ajoute à la sélection ou l’en retire" onClick={p.selection.onMultiple}>
              Choisir plusieurs
            </button>
            {p.selection.nombre === 0 ? (
              <p className="text-base text-[var(--text2)]" aria-live="polite">
                {p.selection.multiple ? 'Toucher les objets à choisir, l’un après l’autre.' : 'Toucher un objet de la page pour le choisir.'}
              </p>
            ) : (
              <>
                <span className="text-base text-[var(--text2)]" aria-live="polite">{p.selection.nombre === 1 ? '1 objet choisi' : `${p.selection.nombre} objets choisis`}</span>
                {p.selection.modifiable && <button type="button" className={`${OUTIL_GRIS} ${PUCE}`} onClick={p.selection.onModifier}>Modifier</button>}
                {p.selection.peutGrouper && <button type="button" className={`${OUTIL_GRIS} ${PUCE}`} onClick={p.selection.onGrouper}>Grouper</button>}
                {p.selection.peutDegrouper && <button type="button" className={`${OUTIL_GRIS} ${PUCE}`} onClick={p.selection.onDegrouper}>Dégrouper</button>}
                <button type="button" className={`${OUTIL_GRIS} ${PUCE}`} onClick={p.selection.onSupprimer}>Supprimer</button>
              </>
            )}
          </div>
        )}
        {p.palette && (
          <>
            <PaletteCouleurs couleurs={p.palette === 'surligneur' ? COULEURS_SURLIGNEUR : COULEURS} choisie={p.couleur} onChoisir={p.setCouleur} taille={48} />
          </>
        )}
        {p.surligneur && (
          <div role="group" aria-label="Surligneur" className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {p.surligneur.afficherMode && (
              <div role="group" aria-label="Mode de tracé" className={CONTENEUR_SEGMENTS}>
                <button type="button" className={p.surligneur.mode === 'libre' ? SEGMENT_ACTIF : SEGMENT} aria-pressed={p.surligneur.mode === 'libre'}
                  title="Le trait suit le doigt" onClick={() => p.surligneur?.setMode('libre')}>Libre</button>
                <button type="button" className={p.surligneur.mode === 'lineaire' ? SEGMENT_ACTIF : SEGMENT} aria-pressed={p.surligneur.mode === 'lineaire'}
                  title="Glisser du début à la fin : le trait reste droit" onClick={() => p.surligneur?.setMode('lineaire')}>Linéaire</button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <label htmlFor="epaisseur-surligneur" className="text-base">Épaisseur</label>
              <input id="epaisseur-surligneur" type="range" className="h-11 w-36 cursor-pointer accent-[#1d4ed8]"
                min={SURLIGNEUR_EPAISSEUR_MIN_MM} max={SURLIGNEUR_EPAISSEUR_MAX_MM} step={SURLIGNEUR_EPAISSEUR_PAS_MM}
                value={p.surligneur.epaisseur} onChange={e => p.surligneur?.setEpaisseur(Number(e.target.value))}
                aria-valuetext={`${String(p.surligneur.epaisseur).replace('.', ',')} millimètres`} />
              <span className="min-w-[4.5rem] text-base" aria-live="polite">{String(p.surligneur.epaisseur).replace('.', ',')} mm</span>
              {/* Aperçu : un trait de la vraie épaisseur (1 mm ≈ 3,78 px à 100 %) */}
              <span aria-hidden className="inline-block w-14 shrink-0 rounded-sm"
                style={{ height: `${Math.max(2, p.surligneur.epaisseur * 3.78)}px`, background: p.surligneur.couleur, opacity: SURLIGNEUR_OPACITE }} />
            </div>
          </div>
        )}
        {p.tailleTexte && (
          <div role="group" aria-label="Taille du texte" className="flex items-center gap-2">
            <span className="text-base font-medium">Taille</span>
            <div className={CONTENEUR_SEGMENTS}>
            {TAILLES_TEXTE_PT.map(t => (
              <button key={t} type="button" className={(p.tailleTexte?.valeur === t ? SEGMENT_ACTIF : SEGMENT) + ' !min-w-[52px]'}
                aria-pressed={p.tailleTexte?.valeur === t} title={`Taille ${t}`} onClick={() => p.tailleTexte?.onChoisir(t)}>
                {t}
              </button>
            ))}
            </div>
          </div>
        )}
        {p.montrerEpaisseur && (
          <>
            <div role="group" aria-label="Épaisseur du trait" className={CONTENEUR_SEGMENTS}>
              {EPAISSEURS.map(e => (
                <button key={e.mm} type="button" className={p.epaisseur === e.mm ? SEGMENT_ACTIF : SEGMENT}
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
        <button type="button" className={`${OUTIL_GRIS} shrink-0 !h-[48px] !w-[48px] !rounded-full justify-center !px-0`} aria-label="Dézoomer"
          onClick={() => p.setZoom(Math.max(0.5, +(p.zoom - 0.25).toFixed(2)))}><IconeUi nom="moins" taille={22} /></button>
        <span className="min-w-[3.5rem] text-center text-lg" aria-live="polite">{Math.round(p.zoom * 100)} %</span>
        <button type="button" className={`${OUTIL_GRIS} shrink-0 !h-[48px] !w-[48px] !rounded-full justify-center !px-0`} aria-label="Zoomer"
          onClick={() => p.setZoom(Math.min(3, +(p.zoom + 0.25).toFixed(2)))}><IconeUi nom="plus" taille={22} /></button>
      </div>
    </div>
  );
}

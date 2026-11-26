import { useEffect, useState } from 'react';
import { COULEURS_SURLIGNEUR, SURLIGNEUR_EPAISSEUR_MAX_MM, SURLIGNEUR_EPAISSEUR_MIN_MM, SURLIGNEUR_EPAISSEUR_PAS_MM, SURLIGNEUR_OPACITE } from '../lib/couleurs';
import { FORMES } from '../model/formes';
import { OUTILS } from '../model/outils';
import { TAILLES_TEXTE_PT } from '../model/texte';
import { COULEURS, EPAISSEURS, type PropsOutils } from './BarreOutils';
import { CONTENEUR_SEGMENTS, OPTION_CHOISIE, OUTIL_GRIS, SEGMENT, SEGMENT_ACTIF } from './ColonneOutils';
import { IconeUi } from './iconesOutils';
import { longueurCm } from '../model/instruments';
import { FACTEURS_LOUPE } from '../model/loupe';
import { PaletteCouleurs } from './PaletteCouleurs';

const PUCE = '!w-auto';

/** Le bandeau n'a que deux contenus possibles (couleur, épaisseur) : on réserve la hauteur du plus haut. */
function variantePleine(p: PropsOutils): PropsOutils {
  return { ...p, outil: 'stylo', palette: 'encre', montrerEpaisseur: true };
}

/**
 * Bandeau fixe au-dessus de la page : couleur et épaisseur du trait, ou l'aide de l'outil quand il n'a ni l'une ni l'autre.
 * Sa hauteur ne change jamais (ni au choix d'un outil, ni au choix d'un objet) : sinon la page glisse sous la main.
 * La variante pleine est dessinée invisible dans la même case de grille et fixe la hauteur, quelle que soit la largeur.
 * Les options propres à un outil (forme, objet choisi, taille du texte…) sont dans la fenêtre d'options, hors de la page.
 */
export function BandeauReglages(p: PropsOutils) {
  return (
    <div className="carte-flottante sticky top-[64px] z-40 mx-3 mt-3 grid px-3" role="group" aria-label="Réglages de l’outil">
      <div className="col-start-1 row-start-1 min-w-0"><Coeur {...p} /></div>
      <div aria-hidden className="pointer-events-none invisible col-start-1 row-start-1 min-w-0"><Coeur {...variantePleine(p)} /></div>
    </div>
  );
}

function Coeur(p: PropsOutils) {
  const aide = OUTILS.find(o => o.id === p.outil)?.aide;
  const aDesOptions = aOptions(p);
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-2 py-2">
      {p.palette && <PaletteCouleurs couleurs={p.palette === 'surligneur' ? COULEURS_SURLIGNEUR : COULEURS} choisie={p.couleur} onChoisir={p.setCouleur} taille={48} />}
      {p.montrerEpaisseur && (
        <div role="group" aria-label="Épaisseur du trait" className={CONTENEUR_SEGMENTS}>
          {EPAISSEURS.map(e => (
            <button key={e.mm} type="button" className={p.epaisseur === e.mm ? SEGMENT_ACTIF : SEGMENT}
              aria-pressed={p.epaisseur === e.mm} onClick={() => p.setEpaisseur(e.mm)}>
              {e.libelle}
            </button>
          ))}
        </div>
      )}
      {!p.palette && !p.montrerEpaisseur && !aDesOptions && aide && <p className="text-base text-[var(--text2)]">{aide}</p>}
    </div>
  );
}

/** Vrai quand l'outil a des options à montrer dans la fenêtre. */
export function aOptions(p: PropsOutils): boolean {
  return p.outil === 'formes' || p.outil === 'droite' || !!p.selection || !!p.surligneur || !!p.tailleTexte || p.geometrie?.rayonCompas != null || p.geometrie?.facteurLoupe != null;
}

/**
 * Barre du bas, collée au bord de l'écran : fenêtre d'options de l'outil (si besoin) et zoom.
 * Elle flotte au-dessus de la page sans rien déplacer. Ne pas la mettre dans le bandeau : ce serait de la hauteur réservée en plus.
 */
export function BarreBas(p: PropsOutils) {
  // Repliée à la main pour dégager la page ; rouverte d'office quand on change d'outil (ses options sont alors nouvelles).
  const [repliee, setRepliee] = useState(false);
  useEffect(() => setRepliee(false), [p.outil]);
  return (
    <div className="pointer-events-none sticky bottom-3 z-40 mx-3 mb-3 flex items-end justify-between gap-3">
      <div className="min-w-0 flex-1">
        {aOptions(p) && (repliee
          ? (
            <button type="button" className={`${OUTIL_GRIS} pointer-events-auto gap-2 shadow-lg`} aria-expanded={false} onClick={() => setRepliee(false)}>
              <IconeUi nom="haut" />Options de l’outil
            </button>
          )
          : <FenetreOptions {...p} onReplier={() => setRepliee(true)} />)}
      </div>
      <Zoom zoom={p.zoom} setZoom={p.setZoom} />
    </div>
  );
}

function Zoom({ zoom, setZoom }: { zoom: number; setZoom: (z: number) => void }) {
  return (
    <div className="carte-flottante pointer-events-auto flex shrink-0 items-center gap-2 p-2" role="group" aria-label="Zoom">
      <button type="button" className={`${OUTIL_GRIS} shrink-0 !h-[48px] !w-[48px] !rounded-full justify-center !px-0`} aria-label="Dézoomer"
        onClick={() => setZoom(Math.max(0.5, +(zoom - 0.25).toFixed(2)))}><IconeUi nom="moins" taille={22} /></button>
      <span className="min-w-[3.5rem] text-center text-lg" aria-live="polite">{Math.round(zoom * 100)} %</span>
      <button type="button" className={`${OUTIL_GRIS} shrink-0 !h-[48px] !w-[48px] !rounded-full justify-center !px-0`} aria-label="Zoomer"
        onClick={() => setZoom(Math.min(3, +(zoom + 0.25).toFixed(2)))}><IconeUi nom="plus" taille={22} /></button>
    </div>
  );
}

function FenetreOptions(p: PropsOutils & { onReplier: () => void }) {
  return (
    <div className="carte-flottante pointer-events-auto flex flex-wrap items-center gap-x-6 gap-y-2 p-3 shadow-2xl ring-1 ring-[var(--border2)]" role="group" aria-label="Options de l’outil">
      {p.outil === 'droite' && (
        <p className="text-base text-[var(--text2)]">Toucher le premier point, puis le deuxième : la droite passe par les deux. Les points se déplacent ensuite avec Sélectionner.</p>
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
      {p.geometrie?.rayonCompas != null && (
        <div role="group" aria-label="Écartement du compas" className="flex flex-col gap-1.5">
          <div className="flex items-baseline gap-3">
            <span className="text-base font-medium">Écartement du compas</span>
            <span className="text-lg font-bold" aria-live="polite">{longueurCm(p.geometrie.rayonCompas)}</span>
          </div>
          <div className="flex gap-1.5">
            {([['−1 cm', -10], ['−1 mm', -1], ['+1 mm', 1], ['+1 cm', 10]] as const).map(([libelle, delta]) => (
              <button key={libelle} type="button" className={`${OUTIL_GRIS} ${PUCE} justify-center !min-w-[56px] !px-2`} onClick={() => p.geometrie!.ajusterRayon(delta)}>{libelle}</button>
            ))}
          </div>
        </div>
      )}
      {p.geometrie?.facteurLoupe != null && (
        <div role="group" aria-label="Agrandissement de la loupe" className="flex items-center gap-2">
          <span className="text-base font-medium">Loupe</span>
          <div className={CONTENEUR_SEGMENTS}>
            {FACTEURS_LOUPE.map(f => (
              <button key={f} type="button" className={(p.geometrie?.facteurLoupe === f ? SEGMENT_ACTIF : SEGMENT) + ' !min-w-[56px]'}
                aria-pressed={p.geometrie?.facteurLoupe === f} onClick={() => p.geometrie?.changerFacteurLoupe(f)}>×{f}</button>
            ))}
          </div>
        </div>
      )}
      <button type="button" className={`${OUTIL_GRIS} ml-auto gap-2 ${PUCE}`} aria-expanded onClick={p.onReplier} title="Replier cette fenêtre pour voir toute la page">
        <IconeUi nom="bas" />Replier
      </button>
    </div>
  );
}

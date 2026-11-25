import type { Fond, Niveau, TypeForme } from '../model/types';
import { COULEURS_SURLIGNEUR } from '../lib/couleurs';
import { FONDS } from '../model/fonds';
import { FORMES } from '../model/formes';
import { TAILLES_TEXTE_PT } from '../model/texte';
import { outilsPour, type OutilId } from '../model/outils';

export const COULEURS = [
  { hex: '#1a1814', nom: 'Noir' },
  { hex: '#1d4ed8', nom: 'Bleu' },
  { hex: '#dc2626', nom: 'Rouge' },
  { hex: '#15803d', nom: 'Vert' },
  { hex: '#f97316', nom: 'Orange' },
  { hex: '#7c3aed', nom: 'Violet' },
];
export const EPAISSEURS = [
  { mm: 0.4, libelle: 'Fin' },
  { mm: 0.8, libelle: 'Moyen' },
  { mm: 1.6, libelle: 'Épais' },
];

export type PropsOutils = {
  niveau: Niveau;
  outil: OutilId;
  setOutil: (o: OutilId) => void;
  couleur: string;
  setCouleur: (c: string) => void;
  epaisseur: number;
  setEpaisseur: (e: number) => void;
  formeChoisie: TypeForme;
  setFormeChoisie: (f: TypeForme) => void;
  /** Surligneur : mode de tracé et épaisseur (curseur), seulement quand l'outil ou la sélection est un surligneur. */
  surligneur?: {
    mode: 'libre' | 'lineaire';
    setMode: (m: 'libre' | 'lineaire') => void;
    afficherMode: boolean; // l'outil Surligneur est actif (pas pour une sélection)
    epaisseur: number;
    setEpaisseur: (mm: number) => void;
    couleur: string;
  };
  /** Taille du texte (points) : `valeur` null = tailles différentes parmi les textes choisis. */
  tailleTexte?: { valeur: number | null; onChoisir: (pt: number) => void };
  /** Palette affichée ; null = aucune (outil Sélectionner sans objet choisi). */
  palette: 'encre' | 'surligneur' | null;
  montrerEpaisseur: boolean;
  /** Outil Sélectionner : état de la sélection et actions sur l'objet choisi. */
  selection?: {
    nombre: number; // objets choisis (un groupe entier compte pour plusieurs)
    multiple: boolean; // mode « Choisir plusieurs »
    onMultiple: () => void;
    modifiable: boolean; // un seul objet choisi, de texte ou de maths
    peutGrouper: boolean;
    peutDegrouper: boolean;
    onModifier: () => void;
    onGrouper: () => void;
    onDegrouper: () => void;
    onSupprimer: () => void;
  };
  fond: Fond;
  setFond: (f: Fond) => void;
  peutAnnuler: boolean;
  peutRetablir: boolean;
  onAnnuler: () => void;
  onRetablir: () => void;
  zoom: number;
  setZoom: (z: number) => void;
};

export function BarreOutils(p: PropsOutils) {
  const grand = p.niveau === 'p1p2';
  const bouton = (actif: boolean) =>
    `plai-btn ${grand ? 'min-h-[64px] min-w-[64px] text-lg' : 'min-h-[44px] min-w-[44px]'} ${actif ? 'ring-4 ring-[#0f6e56]' : ''}`;

  return (
    <div className="carte-flottante sticky top-[64px] z-50 mx-3 mt-3 flex flex-wrap items-center gap-2 p-2" role="toolbar" aria-label="Outils">
      {outilsPour(p.niveau).map(o => (
        <button key={o.id} type="button" className={bouton(p.outil === o.id)} title={o.aide} aria-pressed={p.outil === o.id} onClick={() => p.setOutil(o.id)}>
          {o.libelle}
        </button>
      ))}
      {p.outil === 'formes' && (
        <>
          <span className="mx-2 h-8 w-px bg-[var(--border)]" aria-hidden />
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Forme à tracer">
            {FORMES.map(f => (
              <button key={f.id} type="button" className={bouton(p.formeChoisie === f.id)} aria-pressed={p.formeChoisie === f.id}
                title={`${f.libelle} : glisser sur la page`} onClick={() => p.setFormeChoisie(f.id)}>
                {f.libelle}
              </button>
            ))}
          </div>
        </>
      )}
      {p.selection && (
        <>
          <span className="mx-2 h-8 w-px bg-[var(--border)]" aria-hidden />
          {p.selection.nombre > 0 ? (
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Objet choisi">
              {p.selection.modifiable && <button type="button" className={bouton(false)} onClick={p.selection.onModifier}>Modifier</button>}
              <button type="button" className={bouton(false)} onClick={p.selection.onSupprimer}>Supprimer</button>
            </div>
          ) : (
            <span className="text-base text-[var(--text2)]" aria-live="polite">Toucher un objet de la page pour le choisir.</span>
          )}
        </>
      )}
      {p.palette && <span className="mx-2 h-8 w-px bg-[var(--border)]" aria-hidden />}
      {p.palette && (p.palette === 'surligneur' ? COULEURS_SURLIGNEUR : COULEURS).map(c => (
        <button key={c.hex} type="button" aria-label={c.nom} title={c.nom} aria-pressed={p.couleur === c.hex} onClick={() => p.setCouleur(c.hex)}
          className={`h-11 w-11 rounded-full border-2 ${p.couleur === c.hex ? 'border-[#0f6e56] ring-2 ring-[#0f6e56]' : 'border-white'}`}
          style={{ background: c.hex }} />
      ))}
      {p.tailleTexte && (
        <>
          <span className="mx-2 h-8 w-px bg-[var(--border)]" aria-hidden />
          <div role="group" aria-label="Taille du texte" className="flex items-center gap-2">
            <span>Taille</span>
            {TAILLES_TEXTE_PT.map(t => (
              <button key={t} type="button" className={bouton(p.tailleTexte?.valeur === t)} aria-pressed={p.tailleTexte?.valeur === t} onClick={() => p.tailleTexte?.onChoisir(t)}>
                {t}
              </button>
            ))}
          </div>
        </>
      )}
      {p.montrerEpaisseur && (
        <>
          <span className="mx-2 h-8 w-px bg-[var(--border)]" aria-hidden />
          {EPAISSEURS.map(e => (
            <button key={e.mm} type="button" className={bouton(p.epaisseur === e.mm)} aria-pressed={p.epaisseur === e.mm} onClick={() => p.setEpaisseur(e.mm)}>
              {e.libelle}
            </button>
          ))}
        </>
      )}
      <span className="mx-2 h-8 w-px bg-[var(--border)]" aria-hidden />
      <button type="button" className={bouton(false)} disabled={!p.peutAnnuler} onClick={p.onAnnuler}>Annuler</button>
      <button type="button" className={bouton(false)} disabled={!p.peutRetablir} onClick={p.onRetablir}>Rétablir</button>
      <span className="mx-2 h-8 w-px bg-[var(--border)]" aria-hidden />
      <button type="button" className={bouton(false)} aria-label="Dézoomer" onClick={() => p.setZoom(Math.max(0.5, +(p.zoom - 0.25).toFixed(2)))}>−</button>
      <span className="min-w-[3.5rem] text-center" aria-live="polite">{Math.round(p.zoom * 100)} %</span>
      <button type="button" className={bouton(false)} aria-label="Zoomer" onClick={() => p.setZoom(Math.min(3, +(p.zoom + 0.25).toFixed(2)))}>+</button>
      <label className="ml-2 flex items-center gap-2">
        Fond de la page
        <select className="plai-input min-h-[44px]" value={p.fond} onChange={e => p.setFond(e.target.value as Fond)}>
          {FONDS.map(f => <option key={f.id} value={f.id}>{f.libelle}</option>)}
        </select>
      </label>
    </div>
  );
}

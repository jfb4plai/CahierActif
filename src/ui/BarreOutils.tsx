import type { Fond, Niveau, TypeForme } from '../model/types';
import { COULEURS_SURLIGNEUR } from '../lib/couleurs';
import { FONDS } from '../model/fonds';
import { FORMES } from '../model/formes';
import { TAILLES_TEXTE_PT } from '../model/texte';
import { PaletteCouleurs } from './PaletteCouleurs';
import type { IdInstrument } from '../model/instruments';
import { outilsPour, type OutilId } from '../model/outils';
import { OUTIL_ACTIF, OUTIL_GRIS } from './ColonneOutils';
import { IconeOutil, IconeUi } from './iconesOutils';

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
  /** Instruments de géométrie (règle, équerre), colonne d'outils seulement : posés ou retirés d'un bouton. */
  geometrie?: { regle: boolean; equerre: boolean; basculer: (id: IdInstrument) => void };
};

export function BarreOutils(p: PropsOutils) {
  const grand = p.niveau === 'p1p2';
  // Même langage que la colonne d'outils : l'outil ou le choix actif est plein bleu, tous les autres sont gris.
  // (Avant : tous verts, l'actif seulement cerclé de vert, donc presque invisible.)
  const bouton = (actif: boolean) =>
    `${actif ? OUTIL_ACTIF : OUTIL_GRIS} justify-center ${grand ? '!min-h-[64px] !min-w-[64px]' : '!min-h-[44px] !min-w-[44px]'}`;

  return (
    <div className="carte-flottante sticky top-[64px] z-50 mx-3 mt-3 flex flex-wrap items-center gap-2 p-2" role="toolbar" aria-label="Outils">
      {outilsPour(p.niveau).map(o => (
        <button key={o.id} type="button" className={`${bouton(p.outil === o.id)} ${grand ? 'flex-col gap-1 !py-2' : 'gap-2'}`} title={o.aide} aria-pressed={p.outil === o.id} onClick={() => p.setOutil(o.id)}>
          <IconeOutil id={o.id} taille={grand ? 30 : 22} />
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
      {p.palette && <PaletteCouleurs couleurs={p.palette === 'surligneur' ? COULEURS_SURLIGNEUR : COULEURS} choisie={p.couleur} onChoisir={p.setCouleur} taille={44} />}
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
      <button type="button" className={`${bouton(false)} gap-2`} disabled={!p.peutAnnuler} onClick={p.onAnnuler}><IconeUi nom="annuler" taille={22} />Annuler</button>
      <button type="button" className={`${bouton(false)} gap-2`} disabled={!p.peutRetablir} onClick={p.onRetablir}><IconeUi nom="retablir" taille={22} />Rétablir</button>
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

import type { Fond, Niveau } from '../model/types';
import { FONDS } from '../model/fonds';
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

type Props = {
  niveau: Niveau;
  outil: OutilId;
  setOutil: (o: OutilId) => void;
  couleur: string;
  setCouleur: (c: string) => void;
  epaisseur: number;
  setEpaisseur: (e: number) => void;
  fond: Fond;
  setFond: (f: Fond) => void;
  peutAnnuler: boolean;
  peutRetablir: boolean;
  onAnnuler: () => void;
  onRetablir: () => void;
  zoom: number;
  setZoom: (z: number) => void;
};

export function BarreOutils(p: Props) {
  const grand = p.niveau === 'p1p2';
  const bouton = (actif: boolean) =>
    `plai-btn ${grand ? 'min-h-[64px] min-w-[64px] text-lg' : 'min-h-[44px] min-w-[44px]'} ${actif ? 'ring-4 ring-[#0f6e56]' : ''}`;

  return (
    <div className="sticky top-[52px] z-50 flex flex-wrap items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] p-2" role="toolbar" aria-label="Outils">
      {outilsPour(p.niveau).map(o => (
        <button key={o.id} type="button" className={bouton(p.outil === o.id)} title={o.aide} aria-pressed={p.outil === o.id} onClick={() => p.setOutil(o.id)}>
          {o.libelle}
        </button>
      ))}
      <span className="mx-2 h-8 w-px bg-[var(--border)]" aria-hidden />
      {COULEURS.map(c => (
        <button key={c.hex} type="button" aria-label={c.nom} title={c.nom} aria-pressed={p.couleur === c.hex} onClick={() => p.setCouleur(c.hex)}
          className={`h-11 w-11 rounded-full border-2 ${p.couleur === c.hex ? 'border-[#0f6e56] ring-2 ring-[#0f6e56]' : 'border-white'}`}
          style={{ background: c.hex }} />
      ))}
      <span className="mx-2 h-8 w-px bg-[var(--border)]" aria-hidden />
      {EPAISSEURS.map(e => (
        <button key={e.mm} type="button" className={bouton(p.epaisseur === e.mm)} aria-pressed={p.epaisseur === e.mm} onClick={() => p.setEpaisseur(e.mm)}>
          {e.libelle}
        </button>
      ))}
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

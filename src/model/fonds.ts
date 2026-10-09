import type { Fond } from './types';

export type Ligne = { x1: number; y1: number; x2: number; y2: number; couleur: string; epaisseur: number };
export type Rond = { x: number; y: number; r: number; couleur: string };
export type Motif = { lignes: Ligne[]; ronds: Rond[] };

export const FONDS: { id: Fond; libelle: string }[] = [
  { id: 'aucun', libelle: 'Aucun' },
  { id: 'quadrille5', libelle: 'Quadrillé 5 mm' },
  { id: 'quadrille10', libelle: 'Quadrillé 1 cm' },
  { id: 'seyes', libelle: 'Seyes' },
  { id: 'pointe', libelle: 'Pointé' },
];

// Boucles sur des entiers k pour éviter les erreurs d'arrondi (0,1 + 0,2…).
function grille(l: number, h: number, pas: number, couleur: string, epaisseur: number): Ligne[] {
  const out: Ligne[] = [];
  for (let k = 1; k * pas < l; k++) out.push({ x1: k * pas, y1: 0, x2: k * pas, y2: h, couleur, epaisseur });
  for (let k = 1; k * pas < h; k++) out.push({ x1: 0, y1: k * pas, x2: l, y2: k * pas, couleur, epaisseur });
  return out;
}

function seyes(l: number, h: number): Ligne[] {
  const out: Ligne[] = [];
  for (let k = 1; k * 2 < h; k++) {
    const y = k * 2;
    const forte = k % 4 === 0;
    out.push({ x1: 0, y1: y, x2: l, y2: y, couleur: forte ? '#8fb3d9' : '#cfe0f0', epaisseur: forte ? 0.25 : 0.12 });
  }
  out.push({ x1: 40, y1: 0, x2: 40, y2: h, couleur: '#e05a5a', epaisseur: 0.3 });
  for (let k = 1; 40 + k * 8 < l; k++) out.push({ x1: 40 + k * 8, y1: 0, x2: 40 + k * 8, y2: h, couleur: '#8fb3d9', epaisseur: 0.2 });
  return out;
}

function pointe(l: number, h: number): Rond[] {
  const out: Rond[] = [];
  for (let i = 1; i * 5 < l; i++) for (let j = 1; j * 5 < h; j++) out.push({ x: i * 5, y: j * 5, r: 0.3, couleur: '#9aa5a8' });
  return out;
}

export function motifFond(fond: Fond, l: number, h: number): Motif {
  switch (fond) {
    case 'quadrille5': return { lignes: grille(l, h, 5, '#b8d4e8', 0.15), ronds: [] };
    case 'quadrille10': return { lignes: grille(l, h, 10, '#9cc2de', 0.2), ronds: [] };
    case 'seyes': return { lignes: seyes(l, h), ronds: [] };
    case 'pointe': return { lignes: [], ronds: pointe(l, h) };
    default: return { lignes: [], ronds: [] };
  }
}

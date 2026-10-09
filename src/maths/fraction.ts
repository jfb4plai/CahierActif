import { ptVersMm } from '../lib/units';
import { nouvelId } from '../model/types';
import type { Fraction } from '../model/types';

export const TAILLE_FRACTION_PT = 16;
const LARGEUR_CHIFFRE = 0.6; // en proportion de la taille de police (Arial)

type Rect = { x: number; y: number; l: number; h: number };
export type GeometrieFraction = { largeur: number; hauteur: number; numerateur: Rect; denominateur: Rect; barreY: number };

export function creerFraction(x: number, y: number, couleur: string): Fraction {
  return { id: nouvelId(), type: 'fraction', x, y, numerateur: '', denominateur: '', taillePt: TAILLE_FRACTION_PT, couleur };
}

export function geometrieFraction(f: Fraction): GeometrieFraction {
  const t = ptVersMm(f.taillePt);
  const n = Math.max(1, f.numerateur.length, f.denominateur.length);
  const largeur = n * LARGEUR_CHIFFRE * t + 3;
  const h = 1.3 * t;
  return {
    largeur,
    hauteur: 2 * h + 1,
    numerateur: { x: 0, y: 0, l: largeur, h },
    barreY: h + 0.5,
    denominateur: { x: 0, y: h + 1, l: largeur, h },
  };
}

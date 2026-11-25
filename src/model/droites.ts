import { nouvelId } from './types';
import type { Droite, Point } from './types';

export type Segment = { x1: number; y1: number; x2: number; y2: number };

/**
 * Droite (AB) prolongée jusqu'aux bords du rectangle [xmin, xmax] × [ymin, ymax] (découpe de Liang-Barsky).
 * null si A et B sont confondus ou si la droite ne traverse pas le rectangle.
 */
export function prolongerDansRect(a: Point, b: Point, xmin: number, xmax: number, ymin: number, ymax: number): Segment | null {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 0 && dy === 0) return null;
  let t0 = -Infinity;
  let t1 = Infinity;
  // Contrainte p·t ≤ q : p < 0 borne t par le bas, p > 0 par le haut, p = 0 : toujours vraie ou jamais.
  const borne = (p: number, q: number) => {
    if (p === 0) return q >= 0;
    if (p < 0) t0 = Math.max(t0, q / p);
    else t1 = Math.min(t1, q / p);
    return true;
  };
  if (!borne(-dx, a.x - xmin) || !borne(dx, xmax - a.x) || !borne(-dy, a.y - ymin) || !borne(dy, ymax - a.y)) return null;
  if (!(t0 <= t1) || !Number.isFinite(t0) || !Number.isFinite(t1)) return null;
  return { x1: a.x + t0 * dx, y1: a.y + t0 * dy, x2: a.x + t1 * dx, y2: a.y + t1 * dy };
}

/** Distance (mm) d'un point à la droite infinie (AB). A et B confondus : distance au point. */
export function distPointDroite(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const n = Math.hypot(dx, dy);
  if (n === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  return Math.abs(dx * (p.y - a.y) - dy * (p.x - a.x)) / n;
}

export const ECART_MIN_DROITE = 2; // mm : deux points plus proches ne définissent pas une droite sûre

/** Droite par deux points posés sur la feuille ; null s'ils sont trop proches. */
export function creerDroite(a: Point, b: Point, couleur: string, epaisseur: number): Droite | null {
  if (Math.hypot(b.x - a.x, b.y - a.y) < ECART_MIN_DROITE) return null;
  return { id: nouvelId(), type: 'droite', a: { x: a.x, y: a.y }, b: { x: b.x, y: b.y }, couleur, epaisseur };
}

/** Segment à dessiner sur une page de largeur × hauteur (mm). */
export function droiteSurPage(d: Droite, largeur: number, hauteur: number): Segment | null {
  return prolongerDansRect(d.a, d.b, 0, largeur, 0, hauteur);
}

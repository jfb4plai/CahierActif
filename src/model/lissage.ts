import type { Point } from './types';

/** Force du lissage du trait à main levée : rayon (en nombre de points) de la moyenne glissante. */
export type Lissage = 'aucun' | 'leger' | 'fort';
export const RAYON_LISSAGE: Record<Lissage, number> = { aucun: 0, leger: 3, fort: 8 };
export const LISSAGES: Lissage[] = ['aucun', 'leger', 'fort'];

/**
 * Adoucit un trait tremblé : chaque point devient la moyenne pondérée (triangle) de ses voisins dans le rayon donné.
 * Le premier et le dernier point restent exactement là où le stylet a touché et quitté la page ; la fenêtre rétrécit près des bouts
 * pour que le début et la fin du trait ne dérivent pas. La pression (p) est moyennée de la même façon quand elle existe.
 * Un trait de 2 points ou moins est rendu tel quel.
 */
export function lisserTrait(points: Point[], rayon: number): Point[] {
  const n = points.length;
  if (rayon <= 0 || n <= 2) return points;
  return points.map((pt, i) => {
    if (i === 0 || i === n - 1) return pt;
    const r = Math.min(rayon, i, n - 1 - i);
    let somme = 0, x = 0, y = 0, p = 0, avecP = true;
    for (let k = -r; k <= r; k++) {
      const w = r + 1 - Math.abs(k);
      const q = points[i + k];
      somme += w; x += w * q.x; y += w * q.y;
      if (q.p === undefined) avecP = false; else p += w * q.p;
    }
    return avecP ? { x: x / somme, y: y / somme, p: p / somme } : { x: x / somme, y: y / somme };
  });
}

import { boiteObjet, hauteurTexte } from './boites';
import type { Objet, Point, Trait } from './types';

export { hauteurTexte };

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

export function distPointSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return dist(p, a);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
  return dist(p, { x: a.x + t * dx, y: a.y + t * dy });
}

function traitTouche(t: Trait, p: Point, rayon: number): boolean {
  const marge = rayon + t.epaisseur / 2;
  if (t.points.length === 1) return dist(p, t.points[0]) <= marge;
  for (let i = 1; i < t.points.length; i++) {
    if (distPointSegment(p, t.points[i - 1], t.points[i]) <= marge) return true;
  }
  return false;
}

export function objetTouche(o: Objet, p: Point, rayon: number): boolean {
  if (o.type === 'trait') return traitTouche(o, p, rayon);
  const b = boiteObjet(o);
  return p.x >= b.x - rayon && p.x <= b.x + b.largeur + rayon && p.y >= b.y - rayon && p.y <= b.y + b.hauteur + rayon;
}

/** Interpole pour qu'aucun écart entre deux points ne dépasse pasMm (traits droits = 2 points). */
export function densifier(points: Point[], pasMm: number): Point[] {
  if (points.length < 2) return points.slice();
  const out: Point[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const n = Math.ceil(dist(a, b) / pasMm);
    for (let k = 1; k <= n; k++) out.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n, p: b.p });
  }
  return out;
}

/** Retire les points à moins de `rayon` de `p` ; renvoie les morceaux restants (≥ 2 points). */
export function effacerPartiel(t: Trait, p: Point, rayon: number, idSuivant: () => string): Trait[] {
  if (!traitTouche(t, p, rayon)) return [t];
  const morceaux: Point[][] = [];
  let courant: Point[] = [];
  for (const q of densifier(t.points, 0.5)) {
    if (dist(q, p) <= rayon) {
      if (courant.length) morceaux.push(courant);
      courant = [];
    } else {
      courant.push(q);
    }
  }
  if (courant.length) morceaux.push(courant);
  return morceaux.filter(m => m.length >= 2).map(m => ({ ...t, id: idSuivant(), points: m }));
}

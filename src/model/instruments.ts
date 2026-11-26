import type { Point } from './types';

/** Instruments de géométrie simulés. Ils ne font pas partie du document : on les pose, on les déplace, on les retire. */
export type IdInstrument = 'regle' | 'equerre';
/** Position du pivot (mm de la page) et rotation (degrés, sens horaire à l'écran). */
export type Instrument = { id: IdInstrument; page: number; x: number; y: number; angle: number };

export const LONGUEUR_REGLE_MM = 200;
export const LARGEUR_REGLE_MM = 34;
export const COTE_EQUERRE_MM = 150;

type Def = {
  /** Contour dans le repère de l'instrument (mm), pivot en (0, 0). */
  sommets: Point[];
  /** Arêtes le long desquelles on peut tracer (indices de sommets, dans l'ordre du contour fermé). */
  aretes: [number, number][];
  /** Poignée de rotation, hors du contour. */
  poignee: Point;
};

const L = LONGUEUR_REGLE_MM / 2;
const H = LARGEUR_REGLE_MM / 2;
const C = COTE_EQUERRE_MM;
// Équerre : triangle rectangle isocèle, pivot au centre de gravité (C/3, C/3 depuis l'angle droit).
const G = C / 3;
const NORMALE = 14 / Math.SQRT2;

export const DEFS: Record<IdInstrument, Def> = {
  regle: {
    sommets: [{ x: -L, y: -H }, { x: L, y: -H }, { x: L, y: H }, { x: -L, y: H }],
    aretes: [[0, 1], [3, 2]], // bord du haut (gradué) et bord du bas
    poignee: { x: L - 12, y: 0 }, // dans la règle, côté droit : jamais hors de la page
  },
  equerre: {
    sommets: [{ x: -G, y: -G }, { x: C - G, y: -G }, { x: -G, y: C - G }],
    aretes: [[0, 1], [1, 2], [2, 0]], // deux côtés de l'angle droit, puis l'hypoténuse
    poignee: { x: (C - 2 * G) / 2 + NORMALE, y: (C - 2 * G) / 2 + NORMALE },
  },
};

const rad = (deg: number) => (deg * Math.PI) / 180;

/** Repère de l'instrument → page. */
export function versPage(i: Instrument, l: Point): Point {
  const c = Math.cos(rad(i.angle)), s = Math.sin(rad(i.angle));
  return { x: i.x + l.x * c - l.y * s, y: i.y + l.x * s + l.y * c };
}

export const sommets = (i: Instrument): Point[] => DEFS[i.id].sommets.map(v => versPage(i, v));
export const poigneePage = (i: Instrument): Point => versPage(i, DEFS[i.id].poignee);
export const aretes = (i: Instrument): { a: Point; b: Point }[] => {
  const v = sommets(i);
  return DEFS[i.id].aretes.map(([a, b]) => ({ a: v[a], b: v[b] }));
};

/** Point de [a, b] le plus proche de q, et sa distance à q. */
export function projeter(a: Point, b: Point, q: Point): { p: Point; distance: number } {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((q.x - a.x) * dx + (q.y - a.y) * dy) / (dx * dx + dy * dy)));
  const p = { x: a.x + t * dx, y: a.y + t * dy };
  return { p, distance: Math.hypot(q.x - p.x, q.y - p.y) };
}

/** L'arête d'instrument la plus proche de q, si elle est à moins de `bandeMm`. */
export function areteProche(instruments: Instrument[], q: Point, bandeMm: number): { instrument: Instrument; a: Point; b: Point } | null {
  let meilleur: { instrument: Instrument; a: Point; b: Point; d: number } | null = null;
  for (const instrument of instruments) {
    for (const { a, b } of aretes(instrument)) {
      const { distance } = projeter(a, b, q);
      if (distance <= bandeMm && (!meilleur || distance < meilleur.d)) meilleur = { instrument, a, b, d: distance };
    }
  }
  return meilleur && { instrument: meilleur.instrument, a: meilleur.a, b: meilleur.b };
}

/** q est-il dans le contour de l'instrument ? */
export function dansContour(i: Instrument, q: Point): boolean {
  const v = sommets(i);
  let dedans = false;
  for (let k = 0, j = v.length - 1; k < v.length; j = k++) {
    if ((v[k].y > q.y) !== (v[j].y > q.y) && q.x < ((v[j].x - v[k].x) * (q.y - v[k].y)) / (v[j].y - v[k].y) + v[k].x) dedans = !dedans;
  }
  return dedans;
}

/** Rotation à donner à l'instrument pour que sa poignée soit dans la direction de q, vue du pivot. */
export function angleVersPoignee(i: Instrument, q: Point): number {
  const h = DEFS[i.id].poignee;
  const voulu = Math.atan2(q.y - i.y, q.x - i.x);
  const degres = ((voulu - Math.atan2(h.y, h.x)) * 180) / Math.PI;
  return ((degres % 360) + 360) % 360;
}

/** Longueur affichée d'un trait le long d'une arête : en cm, une décimale, virgule française. */
export const longueurCm = (mm: number): string => `${(Math.round(mm) / 10).toFixed(1).replace('.', ',')} cm`;

/** Instrument neuf, posé en haut de la page (le pivot de la règle à 100 mm, celui de l'équerre à 150 mm), au milieu en largeur. */
export function creerInstrument(id: IdInstrument, page: number, largeurPageMm: number): Instrument {
  return { id, page, x: largeurPageMm / 2, y: id === 'regle' ? 100 : 170, angle: 0 };
}

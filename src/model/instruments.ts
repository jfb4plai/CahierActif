import type { Point } from './types';

/** Instruments de géométrie simulés. Ils ne font pas partie du document : on les pose, on les déplace, on les retire. */
export type IdInstrument = 'regle' | 'equerre' | 'rapporteur' | 'compas';
/**
 * Position du pivot (mm de la page) et rotation (degrés, sens horaire à l'écran).
 * Compas : (x, y) est la pointe, `angle` la direction de la mine vue de la pointe, `rayon` l'écartement en mm.
 */
export type Instrument = { id: IdInstrument; page: number; x: number; y: number; angle: number; rayon?: number };

export const LONGUEUR_REGLE_MM = 200;
export const LARGEUR_REGLE_MM = 34;
export const COTE_EQUERRE_MM = 150;
export const RAYON_RAPPORTEUR_MM = 75;
export const RAYON_COMPAS_MIN_MM = 5;
export const RAYON_COMPAS_MAX_MM = 140;
export const RAYON_COMPAS_DEFAUT_MM = 40;

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

// Rapporteur : demi-disque au-dessus de sa base, pivot au centre de la base. Contour = base (de gauche à droite) puis l'arc.
const R = RAYON_RAPPORTEUR_MM;
const ARC = Array.from({ length: 37 }, (_, k) => ({ x: -R * Math.cos((k * 5 * Math.PI) / 180), y: -R * Math.sin((k * 5 * Math.PI) / 180) }));

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
  rapporteur: {
    sommets: ARC, // de (-R, 0) par le haut jusqu'à (R, 0) : le côté qui les relie est la base
    aretes: [[0, 36]],
    poignee: { x: 0, y: -R * 0.45 },
  },
  // Le compas n'a ni contour ni bord : la pointe et la mine sont deux poignées (voir InstrumentVue et PageVue).
  compas: { sommets: [], aretes: [], poignee: { x: 0, y: 0 } },
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

/** Instrument neuf, au milieu de la page en largeur, à une hauteur différente pour chacun : posés ensemble, ils ne se cachent pas. */
export function creerInstrument(id: IdInstrument, page: number, largeurPageMm: number): Instrument {
  const y = { regle: 35, equerre: 170, rapporteur: 125, compas: 200 }[id];
  return { id, page, x: largeurPageMm / 2, y, angle: 0, ...(id === 'compas' ? { rayon: RAYON_COMPAS_DEFAUT_MM } : {}) };
}

export const RAYON_COMPAS_PAR_DEFAUT = RAYON_COMPAS_DEFAUT_MM;

/** Écartement du compas, borné : une mine collée à la pointe ou hors de toute page n'a pas de sens. */
export const rayonValide = (mm: number): number => Math.round(Math.max(RAYON_COMPAS_MIN_MM, Math.min(RAYON_COMPAS_MAX_MM, mm)) * 10) / 10;

/** La mine du compas, en mm de page. */
export function crayonPage(i: Instrument): Point {
  const r = i.rayon ?? RAYON_COMPAS_DEFAUT_MM;
  return { x: i.x + r * Math.cos(rad(i.angle)), y: i.y + r * Math.sin(rad(i.angle)) };
}

/** Écart d'angle de `precedent` à `suivant` (radians), ramené dans ]-π, π] : le compas suit le geste sans sauter d'un tour. */
export function ecartAngle(precedent: number, suivant: number): number {
  let d = suivant - precedent;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d <= -Math.PI) d += 2 * Math.PI;
  return d;
}

/** Points d'un arc de centre `c`, de rayon `r`, partant de `depart` (rad) et balayant `balayage` (rad, signé), un point tous les ~2°. */
export function arc(c: Point, r: number, depart: number, balayage: number): Point[] {
  const n = Math.max(1, Math.ceil(Math.abs(balayage) / rad(2)));
  return Array.from({ length: n + 1 }, (_, k) => {
    const a = depart + (balayage * k) / n;
    return { x: c.x + r * Math.cos(a), y: c.y + r * Math.sin(a) };
  });
}

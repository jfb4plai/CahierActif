import { distPointSegmentXY } from './geometrie';
import { nouvelId } from './types';
import type { Forme, Point, TypeForme } from './types';

/** Un tracé dans la boîte unité : (0,0) = haut-gauche, (1,1) = bas-droite. */
export type Chemin = { pts: [number, number][]; ferme: boolean };

export type DefForme = {
  id: TypeForme;
  libelle: string;
  /** À la création, la boîte est ramenée à un carré (carré, rond) ; modifiable ensuite par les poignées. */
  carre: boolean;
  chemins: Chemin[];
};

const ELLIPSE: [number, number][] = Array.from({ length: 48 }, (_, i) => {
  const a = (i / 48) * 2 * Math.PI;
  return [0.5 + 0.5 * Math.cos(a), 0.5 + 0.5 * Math.sin(a)];
});

const MIROIR = (c: Chemin[]): Chemin[] => c.map(p => ({ ...p, pts: p.pts.map(([u, v]): [number, number] => [1 - u, v]) }));
const FLECHE_DROITE: Chemin[] = [
  { pts: [[0, 0.5], [1, 0.5]], ferme: false },
  { pts: [[0.7, 0.1], [1, 0.5], [0.7, 0.9]], ferme: false },
];

/**
 * Catalogue des formes. Pour en ajouter une : un identifiant dans TypeForme (model/types.ts)
 * et une entrée ici avec ses chemins dans la boîte unité. Dessin, export PDF, sélection et
 * gomme s'appuient tous sur ces chemins : rien d'autre à écrire.
 */
export const FORMES: DefForme[] = [
  { id: 'ligne', libelle: 'Ligne', carre: false, chemins: [{ pts: [[0, 0], [1, 1]], ferme: false }] },
  { id: 'rond', libelle: 'Rond', carre: true, chemins: [{ pts: ELLIPSE, ferme: true }] },
  { id: 'carre', libelle: 'Carré', carre: true, chemins: [{ pts: [[0, 0], [1, 0], [1, 1], [0, 1]], ferme: true }] },
  { id: 'rectangle', libelle: 'Rectangle', carre: false, chemins: [{ pts: [[0, 0], [1, 0], [1, 1], [0, 1]], ferme: true }] },
  { id: 'triangle', libelle: 'Triangle', carre: false, chemins: [{ pts: [[0.5, 0], [1, 1], [0, 1]], ferme: true }] },
  { id: 'fleche-gauche', libelle: 'Flèche ←', carre: false, chemins: MIROIR(FLECHE_DROITE) },
  { id: 'fleche-droite', libelle: 'Flèche →', carre: false, chemins: FLECHE_DROITE },
];

export function defForme(id: TypeForme): DefForme {
  const d = FORMES.find(f => f.id === id);
  if (!d) throw new RangeError(`forme inconnue : ${id}`);
  return d;
}

/** Chemins dans le repère local de la forme (mm, origine = coin haut-gauche, avant rotation). */
export function cheminsLocaux(f: Forme): { pts: Point[]; ferme: boolean }[] {
  return defForme(f.forme).chemins.map(c => ({
    ferme: c.ferme,
    pts: c.pts.map(([u, v]) => ({ x: u * f.largeur, y: (f.inverse ? 1 - v : v) * f.hauteur })),
  }));
}

function versPage(f: Forme, q: Point): Point {
  const a = (f.rotation * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: f.x + q.x * c - q.y * s, y: f.y + q.x * s + q.y * c };
}

function versLocal(f: Forme, q: Point): Point {
  const a = (-f.rotation * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const dx = q.x - f.x;
  const dy = q.y - f.y;
  return { x: dx * c - dy * s, y: dx * s + dy * c };
}

/** Chemins en coordonnées page (mm), rotation appliquée : sert à l'export PDF. */
export function cheminsPage(f: Forme): { pts: Point[]; ferme: boolean }[] {
  return cheminsLocaux(f).map(c => ({ ferme: c.ferme, pts: c.pts.map(q => versPage(f, q)) }));
}

/** Le point est sur le contour (à `rayon` près) : gomme. */
export function formeTouchee(f: Forme, p: Point, rayon: number): boolean {
  const q = versLocal(f, p);
  const marge = rayon + f.epaisseur / 2;
  for (const c of cheminsLocaux(f)) {
    const n = c.pts.length;
    for (let i = 1; i < n + (c.ferme ? 1 : 0); i++) {
      const a = c.pts[i - 1];
      const b = c.pts[i % n];
      if (distPointSegmentXY(q, a, b) <= marge) return true;
    }
  }
  return false;
}

/** Le point est dans la boîte de la forme (à `marge` près) : sélection avec l'outil Formes. */
export function formeContient(f: Forme, p: Point, marge: number): boolean {
  const q = versLocal(f, p);
  return q.x >= -marge && q.x <= f.largeur + marge && q.y >= -marge && q.y <= f.hauteur + marge;
}

/** Boîte englobante en mm page, rotation comprise. */
export function boiteForme(f: Forme): { x: number; y: number; largeur: number; hauteur: number } {
  const coins = [{ x: 0, y: 0 }, { x: f.largeur, y: 0 }, { x: f.largeur, y: f.hauteur }, { x: 0, y: f.hauteur }].map(q => versPage(f, q));
  const xs = coins.map(c => c.x);
  const ys = coins.map(c => c.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, largeur: Math.max(...xs) - x, hauteur: Math.max(...ys) - y };
}

export const TAILLE_MIN_FORME = 3; // mm : en dessous d'un glissé plus court, rien n'est créé

/**
 * Forme tracée par un glissé de `debut` à `fin`. Renvoie null si le glissé est trop court (simple toucher).
 * Carré et rond : côté = plus grand des deux écarts, dans le sens du glissé.
 */
export function formeDepuisGlisse(type: TypeForme, debut: Point, fin: Point, couleur: string, epaisseur: number): Forme | null {
  let dx = fin.x - debut.x;
  let dy = fin.y - debut.y;
  if (Math.hypot(dx, dy) < TAILLE_MIN_FORME) return null;
  if (defForme(type).carre) {
    const c = Math.max(Math.abs(dx), Math.abs(dy));
    dx = Math.sign(dx || 1) * c;
    dy = Math.sign(dy || 1) * c;
  }
  const montante = dx * dy < 0;
  return {
    id: nouvelId(),
    type: 'forme',
    forme: type,
    x: Math.min(debut.x, debut.x + dx),
    y: Math.min(debut.y, debut.y + dy),
    largeur: Math.abs(dx),
    hauteur: Math.abs(dy),
    rotation: 0,
    ...(type === 'ligne' && montante ? { inverse: true } : {}),
    couleur,
    epaisseur,
  };
}

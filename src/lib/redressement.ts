import type { ImageSource, TaillePage } from '../model/types';
import { PHOTO_COTE_MAX_PX, PHOTO_QUALITE_JPEG, PhotoIllisibleError, taillePageDepuisImage } from './photo';

export type Pt = { x: number; y: number };
/** Quatre coins, dans l'ordre : haut-gauche, haut-droit, bas-droit, bas-gauche (sens des aiguilles d'une montre). */
export type Quad = [Pt, Pt, Pt, Pt];
export type Pixels = { data: Uint8ClampedArray; width: number; height: number };

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

/** Les quatre coins de l'image entière : aucun recadrage. */
export function quadComplet(largeur: number, hauteur: number): Quad {
  return [{ x: 0, y: 0 }, { x: largeur, y: 0 }, { x: largeur, y: hauteur }, { x: 0, y: hauteur }];
}

/** Tourne le résultat d'un quart de tour (sens horaire) : le coin haut-gauche devient l'ancien coin bas-gauche. */
export function tournerQuart(q: Quad): Quad {
  return [q[3], q[0], q[1], q[2]];
}

/** Quadrilatère convexe d'aire non nulle (sinon le redressement déformerait ou retournerait la photo). */
export function estConvexe(q: Quad): boolean {
  let signe = 0;
  for (let i = 0; i < 4; i++) {
    const a = q[i];
    const b = q[(i + 1) % 4];
    const c = q[(i + 2) % 4];
    const croix = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (Math.abs(croix) < 1e-6) return false;
    const s = Math.sign(croix);
    if (signe === 0) signe = s;
    else if (s !== signe) return false;
  }
  return true;
}

/** Taille (px) de la photo redressée : côtés moyens du quadrilatère, grand côté plafonné à PHOTO_COTE_MAX_PX. */
export function dimensionsSortie(q: Quad): { largeur: number; hauteur: number } {
  let l = (dist(q[0], q[1]) + dist(q[3], q[2])) / 2;
  let h = (dist(q[0], q[3]) + dist(q[1], q[2])) / 2;
  const grand = Math.max(l, h);
  if (grand > PHOTO_COTE_MAX_PX) {
    const k = PHOTO_COTE_MAX_PX / grand;
    l *= k;
    h *= k;
  }
  return { largeur: Math.max(1, Math.round(l)), hauteur: Math.max(1, Math.round(h)) };
}

/** Résout A·x = b (élimination de Gauss, pivot partiel). null si le système est singulier. */
function resoudre(a: number[][], b: number[]): number[] | null {
  const n = b.length;
  const m = a.map((ligne, i) => [...ligne, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
    if (Math.abs(m[p][c]) < 1e-12) return null;
    [m[c], m[p]] = [m[p], m[c]];
    for (let r = c + 1; r < n; r++) {
      const f = m[r][c] / m[c][c];
      for (let k = c; k <= n; k++) m[r][k] -= f * m[c][k];
    }
  }
  const x = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = m[r][n];
    for (let k = r + 1; k < n; k++) s -= m[r][k] * x[k];
    x[r] = s / m[r][r];
  }
  return x;
}

/** Homographie H (3×3, h8 = 1) qui envoie chaque point de `de` sur le point de `vers` de même rang. */
export function homographie(de: Quad, vers: Quad): number[] | null {
  const a: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = de[i];
    const { x: u, y: v } = vers[i];
    a.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);
    a.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }
  const h = resoudre(a, b);
  return h ? [...h, 1] : null;
}

export function appliquer(h: number[], p: Pt): Pt {
  const w = h[6] * p.x + h[7] * p.y + h[8];
  return { x: (h[0] * p.x + h[1] * p.y + h[2]) / w, y: (h[3] * p.x + h[4] * p.y + h[5]) / w };
}

/**
 * Redresse la zone `quad` de `src` en un rectangle de largeur × hauteur (échantillonnage bilinéaire).
 * Ce qui tombe hors de l'image est blanc. null si le quadrilatère est dégénéré.
 */
export function redresser(src: Pixels, quad: Quad, largeur: number, hauteur: number): Pixels | null {
  if (!estConvexe(quad)) return null;
  const rect = quadComplet(largeur, hauteur);
  const h = homographie(rect, quad); // pixel de sortie → pixel de la photo
  if (!h) return null;
  const sortie = new Uint8ClampedArray(largeur * hauteur * 4);
  const { data, width: sw, height: sh } = src;
  const lire = (x: number, y: number, k: number) => {
    if (x < 0 || y < 0 || x >= sw || y >= sh) return 255;
    return data[(y * sw + x) * 4 + k];
  };
  for (let y = 0; y < hauteur; y++) {
    for (let x = 0; x < largeur; x++) {
      const p = appliquer(h, { x: x + 0.5, y: y + 0.5 });
      const u = p.x - 0.5;
      const v = p.y - 0.5;
      const x0 = Math.floor(u);
      const y0 = Math.floor(v);
      const fx = u - x0;
      const fy = v - y0;
      const o = (y * largeur + x) * 4;
      for (let k = 0; k < 3; k++) {
        const haut = lire(x0, y0, k) * (1 - fx) + lire(x0 + 1, y0, k) * fx;
        const bas = lire(x0, y0 + 1, k) * (1 - fx) + lire(x0 + 1, y0 + 1, k) * fx;
        sortie[o + k] = haut * (1 - fy) + bas * fy;
      }
      sortie[o + 3] = 255;
    }
  }
  return { data: sortie, width: largeur, height: hauteur };
}

/**
 * Navigateur : applique le redressement à une photo enregistrée et renvoie la nouvelle photo (JPEG)
 * et la taille de page qui lui correspond.
 */
export async function redresserPhoto(image: ImageSource, quad: Quad): Promise<{ image: ImageSource; taille: TaillePage }> {
  const echec = new PhotoIllisibleError('Le redressement a échoué. Réessayer avec une autre position des coins.');
  const bmp = await createImageBitmap(new Blob([image.data], { type: image.mime }));
  try {
    const c = document.createElement('canvas');
    c.width = bmp.width;
    c.height = bmp.height;
    const ctx = c.getContext('2d');
    if (!ctx) throw echec;
    ctx.drawImage(bmp, 0, 0);
    const brut = ctx.getImageData(0, 0, bmp.width, bmp.height);
    const { largeur, hauteur } = dimensionsSortie(quad);
    const r = redresser({ data: brut.data, width: brut.width, height: brut.height }, quad, largeur, hauteur);
    if (!r) throw echec;
    const c2 = document.createElement('canvas');
    c2.width = largeur;
    c2.height = hauteur;
    const ctx2 = c2.getContext('2d');
    if (!ctx2) throw echec;
    const img = ctx2.createImageData(largeur, hauteur);
    img.data.set(r.data);
    ctx2.putImageData(img, 0, 0);
    const blob = await new Promise<Blob | null>(res => c2.toBlob(res, 'image/jpeg', PHOTO_QUALITE_JPEG));
    if (!blob) throw echec;
    return { image: { mime: 'image/jpeg', data: await blob.arrayBuffer() }, taille: taillePageDepuisImage(largeur, hauteur) };
  } finally {
    bmp.close();
  }
}

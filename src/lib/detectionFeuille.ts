import type { ImageSource } from '../model/types';
import { estConvexe, type Pixels, type Pt, type Quad } from './redressement';

const COTE_ANALYSE_PX = 400; // l'analyse se fait sur une copie réduite : rapide même sur tablette
const AIRE_MIN = 0.25; // en dessous : ce n'est pas la feuille entière
const AIRE_MAX = 0.98; // au-dessus : la feuille remplit tout, rien à recadrer
const CONTRASTE_MIN = 25; // écart de gris minimal entre fond et feuille

/** Seuil d'Otsu (0-255) sur un histogramme de 256 niveaux. */
function otsu(histo: number[], total: number): number {
  let somme = 0;
  for (let i = 0; i < 256; i++) somme += i * histo[i];
  let sommeFond = 0;
  let poidsFond = 0;
  let meilleur = 0;
  let seuil = 127;
  for (let t = 0; t < 256; t++) {
    poidsFond += histo[t];
    if (poidsFond === 0) continue;
    const poidsForme = total - poidsFond;
    if (poidsForme === 0) break;
    sommeFond += t * histo[t];
    const mf = sommeFond / poidsFond;
    const mo = (somme - sommeFond) / poidsForme;
    const v = poidsFond * poidsForme * (mf - mo) * (mf - mo);
    if (v > meilleur) {
      meilleur = v;
      seuil = t;
    }
  }
  return seuil;
}

/**
 * Cherche la feuille (grande zone claire sur fond plus sombre) et renvoie ses 4 coins dans le repère de `src`.
 * null quand le résultat est douteux : image uniforme, zone trop petite ou trop grande, forme non convexe.
 */
export function detecterCoins(src: Pixels): Quad | null {
  const f = Math.max(1, Math.ceil(Math.max(src.width, src.height) / COTE_ANALYSE_PX));
  const w = Math.floor(src.width / f);
  const h = Math.floor(src.height / f);
  if (w < 8 || h < 8) return null;

  // Gris moyen de chaque bloc f×f.
  const gris = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let dy = 0; dy < f; dy++) {
        for (let dx = 0; dx < f; dx++) {
          const o = ((y * f + dy) * src.width + (x * f + dx)) * 4;
          s += 0.299 * src.data[o] + 0.587 * src.data[o + 1] + 0.114 * src.data[o + 2];
        }
      }
      gris[y * w + x] = s / (f * f);
    }
  }
  // Flou 3×3 : efface le grain et les traits fins de texte.
  const flou = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          s += gris[yy * w + xx];
          n++;
        }
      }
      flou[y * w + x] = s / n;
    }
  }
  let min = 255;
  let max = 0;
  const histo = new Array<number>(256).fill(0);
  for (let i = 0; i < flou.length; i++) {
    const v = Math.round(flou[i]);
    histo[v]++;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (max - min < CONTRASTE_MIN) return null;
  const seuil = otsu(histo, flou.length);
  const clair = new Uint8Array(w * h);
  for (let i = 0; i < flou.length; i++) clair[i] = Math.round(flou[i]) > seuil ? 1 : 0;

  // Plus grande composante claire (4-connexité).
  const etiquette = new Int32Array(w * h).fill(-1);
  let meilleure = -1;
  let taille = 0;
  let n = 0;
  const pile: number[] = [];
  for (let d = 0; d < w * h; d++) {
    if (!clair[d] || etiquette[d] >= 0) continue;
    let t = 0;
    pile.length = 0;
    pile.push(d);
    etiquette[d] = n;
    while (pile.length) {
      const p = pile.pop()!;
      t++;
      const x = p % w;
      const y = (p - x) / w;
      const voisins = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1];
      for (const q of voisins) {
        if (q >= 0 && clair[q] && etiquette[q] < 0) {
          etiquette[q] = n;
          pile.push(q);
        }
      }
    }
    if (t > taille) {
      taille = t;
      meilleure = n;
    }
    n++;
  }
  if (meilleure < 0) return null;

  // Trous (texte, ombres) : tout ce qui n'est pas la feuille et n'est pas relié au bord en fait partie.
  const exterieur = new Uint8Array(w * h);
  pile.length = 0;
  const semer = (p: number) => {
    if (etiquette[p] !== meilleure && !exterieur[p]) {
      exterieur[p] = 1;
      pile.push(p);
    }
  };
  for (let x = 0; x < w; x++) {
    semer(x);
    semer((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    semer(y * w);
    semer(y * w + w - 1);
  }
  while (pile.length) {
    const p = pile.pop()!;
    const x = p % w;
    const y = (p - x) / w;
    if (x > 0) semer(p - 1);
    if (x < w - 1) semer(p + 1);
    if (y > 0) semer(p - w);
    if (y < h - 1) semer(p + w);
  }

  // Coins = points extrêmes de la zone (diagonales).
  let aire = 0;
  let hg = Infinity, bd = -Infinity, hd = -Infinity, bg = Infinity; // x+y min/max, x−y max/min
  let phg: Pt = { x: 0, y: 0 }, pbd = phg, phd = phg, pbg = phg;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (exterieur[y * w + x]) continue;
      aire++;
      if (x + y < hg) { hg = x + y; phg = { x, y }; }
      if (x + y > bd) { bd = x + y; pbd = { x, y }; }
      if (x - y > hd) { hd = x - y; phd = { x, y }; }
      if (x - y < bg) { bg = x - y; pbg = { x, y }; }
    }
  }
  const part = aire / (w * h);
  if (part < AIRE_MIN || part > AIRE_MAX) return null;
  const versPhoto = (p: Pt): Pt => ({
    x: Math.min(src.width, Math.max(0, (p.x + 0.5) * f)),
    y: Math.min(src.height, Math.max(0, (p.y + 0.5) * f)),
  });
  const quad: Quad = [versPhoto(phg), versPhoto(phd), versPhoto(pbd), versPhoto(pbg)];
  return estConvexe(quad) ? quad : null;
}

/** Navigateur : détecte les coins de la feuille sur une photo enregistrée. null au moindre doute ou erreur. */
export async function detecterCoinsPhoto(image: ImageSource): Promise<Quad | null> {
  try {
    const bmp = await createImageBitmap(new Blob([image.data], { type: image.mime }));
    try {
      const c = document.createElement('canvas');
      c.width = bmp.width;
      c.height = bmp.height;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      if (!ctx) return null;
      ctx.drawImage(bmp, 0, 0);
      const brut = ctx.getImageData(0, 0, bmp.width, bmp.height);
      return detecterCoins({ data: brut.data, width: brut.width, height: brut.height });
    } finally {
      bmp.close();
    }
  } catch {
    return null;
  }
}

import { describe, it, expect } from 'vitest';
import { detecterCoins } from './detectionFeuille';
import { estConvexe, type Pixels, type Pt } from './redressement';

type Rendu = { sombre: number; clair: number; texte?: boolean };

// Image synthétique : fond sombre, feuille claire (polygone rempli), traits de texte sombres sur la feuille.
function image(w: number, h: number, poly: Pt[] | null, o: Rendu): Pixels {
  const data = new Uint8ClampedArray(w * h * 4);
  const dedans = (x: number, y: number) => {
    if (!poly) return false;
    let s = 0;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      const c = (b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x);
      if (c === 0) continue;
      const sg = Math.sign(c);
      if (s === 0) s = sg;
      else if (s !== sg) return false;
    }
    return true;
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = dedans(x, y) ? o.clair : o.sombre;
      if (o.texte && dedans(x, y) && y % 12 < 3 && x % 40 < 28) v = 30; // lignes de texte
      const k = (y * w + x) * 4;
      data[k] = data[k + 1] = data[k + 2] = v;
      data[k + 3] = 255;
    }
  }
  return { data, width: w, height: h };
}

const rect = (x0: number, y0: number, x1: number, y1: number): Pt[] => [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];
const proche = (a: Pt, b: Pt, tol: number) => Math.hypot(a.x - b.x, a.y - b.y) <= tol;

describe('detecterCoins', () => {
  it('détecte une feuille blanche droite sur fond sombre', () => {
    const p = rect(100, 80, 500, 600);
    const q = detecterCoins(image(640, 800, p, { sombre: 40, clair: 235 }))!;
    expect(q).not.toBeNull();
    p.forEach((c, i) => expect(proche(q[i], c, 6)).toBe(true));
  });

  it('détecte une feuille inclinée de 15°', () => {
    const p: Pt[] = [{ x: 150, y: 90 }, { x: 540, y: 190 }, { x: 440, y: 620 }, { x: 60, y: 520 }];
    const q = detecterCoins(image(640, 800, p, { sombre: 40, clair: 230 }))!;
    expect(q).not.toBeNull();
    p.forEach((c, i) => expect(proche(q[i], c, 10)).toBe(true));
  });

  it('ignore le texte sombre sur la feuille', () => {
    const p = rect(100, 80, 500, 600);
    const q = detecterCoins(image(640, 800, p, { sombre: 40, clair: 235, texte: true }))!;
    expect(q).not.toBeNull();
    p.forEach((c, i) => expect(proche(q[i], c, 8)).toBe(true));
  });

  it('feuille coupée par le bord de la photo : coins sur le bord', () => {
    const q = detecterCoins(image(640, 800, rect(100, 80, 640, 800), { sombre: 40, clair: 235 }))!;
    expect(q).not.toBeNull();
    expect(proche(q[2], { x: 640, y: 800 }, 8)).toBe(true);
  });

  it('renvoie null pour une image uniforme (blanche ou noire)', () => {
    expect(detecterCoins(image(320, 400, null, { sombre: 255, clair: 255 }))).toBeNull();
    expect(detecterCoins(image(320, 400, null, { sombre: 0, clair: 0 }))).toBeNull();
  });

  it('renvoie null si la zone claire fait moins de 25 % de l’image', () => {
    expect(detecterCoins(image(640, 800, rect(250, 300, 400, 450), { sombre: 40, clair: 235 }))).toBeNull();
  });

  it('renvoie null si la zone claire fait plus de 98 % de l’image', () => {
    expect(detecterCoins(image(640, 800, rect(2, 2, 638, 798), { sombre: 40, clair: 235 }))).toBeNull();
  });

  it('feuille très inclinée : null ou quadrilatère convexe, jamais un cadrage tordu', () => {
    const p: Pt[] = [{ x: 320, y: 60 }, { x: 600, y: 330 }, { x: 320, y: 620 }, { x: 40, y: 330 }]; // losange à 45°
    const q = detecterCoins(image(640, 800, p, { sombre: 40, clair: 235 }));
    if (q) expect(estConvexe(q)).toBe(true);
  });
});

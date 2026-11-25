import { describe, it, expect } from 'vitest';
import { appliquer, dimensionsSortie, estConvexe, homographie, quadComplet, redresser, tournerQuart, type Pixels, type Quad } from './redressement';

// Image w × h dont chaque pixel porte sa position dans le canal rouge (x) et vert (y), pour suivre où il atterrit.
function repere(w: number, h: number): Pixels {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      data[o] = x;
      data[o + 1] = y;
      data[o + 2] = 0;
      data[o + 3] = 255;
    }
  }
  return { data, width: w, height: h };
}
const px = (p: Pixels, x: number, y: number) => [0, 1, 2].map(k => p.data[(y * p.width + x) * 4 + k]);

describe('homographie', () => {
  it('envoie chaque coin sur son correspondant', () => {
    const de = quadComplet(100, 50);
    const vers: Quad = [{ x: 10, y: 5 }, { x: 90, y: 12 }, { x: 80, y: 70 }, { x: 5, y: 60 }];
    const h = homographie(de, vers)!;
    de.forEach((p, i) => {
      const r = appliquer(h, p);
      expect(r.x).toBeCloseTo(vers[i].x, 6);
      expect(r.y).toBeCloseTo(vers[i].y, 6);
    });
  });
  it('points alignés : pas de solution', () => {
    const plat: Quad = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 0 }, { x: 30, y: 0 }];
    expect(homographie(quadComplet(10, 10), plat)).toBeNull();
  });
});

describe('estConvexe', () => {
  it('rectangle et trapèze : oui', () => {
    expect(estConvexe(quadComplet(100, 50))).toBe(true);
    expect(estConvexe([{ x: 20, y: 0 }, { x: 80, y: 0 }, { x: 100, y: 50 }, { x: 0, y: 50 }])).toBe(true);
  });
  it('coins croisés ou en flèche : non', () => {
    expect(estConvexe([{ x: 0, y: 0 }, { x: 100, y: 50 }, { x: 100, y: 0 }, { x: 0, y: 50 }])).toBe(false);
    expect(estConvexe([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 20, y: 20 }, { x: 0, y: 100 }])).toBe(false);
  });
  it('points confondus : non', () => {
    expect(estConvexe([{ x: 5, y: 5 }, { x: 5, y: 5 }, { x: 5, y: 5 }, { x: 5, y: 5 }])).toBe(false);
  });
});

describe('dimensionsSortie', () => {
  it('rectangle : ses côtés', () => {
    expect(dimensionsSortie(quadComplet(300, 200))).toEqual({ largeur: 300, hauteur: 200 });
  });
  it('trapèze : côtés moyens', () => {
    const q: Quad = [{ x: 20, y: 0 }, { x: 80, y: 0 }, { x: 100, y: 50 }, { x: 0, y: 50 }]; // haut 60, bas 100
    expect(dimensionsSortie(q).largeur).toBe(80);
  });
  it('plafonné à 2200 px sur le grand côté', () => {
    expect(dimensionsSortie(quadComplet(4400, 2200))).toEqual({ largeur: 2200, hauteur: 1100 });
  });
});

describe('tournerQuart', () => {
  it('quatre quarts de tour : retour au point de départ', () => {
    const q = quadComplet(100, 50);
    expect(tournerQuart(tournerQuart(tournerQuart(tournerQuart(q))))).toEqual(q);
  });
  it('un quart de tour échange largeur et hauteur du résultat', () => {
    const t = tournerQuart(quadComplet(300, 200));
    expect(dimensionsSortie(t)).toEqual({ largeur: 200, hauteur: 300 });
  });
});

describe('redresser', () => {
  it('quadrilatère = image entière : image inchangée', () => {
    const s = repere(40, 30);
    const r = redresser(s, quadComplet(40, 30), 40, 30)!;
    for (const [x, y] of [[0, 0], [10, 7], [39, 29], [20, 15]]) {
      const [rouge, vert] = px(r, x, y);
      expect(Math.abs(rouge - x)).toBeLessThanOrEqual(1);
      expect(Math.abs(vert - y)).toBeLessThanOrEqual(1);
    }
  });
  it('recadrage : la zone choisie remplit la sortie', () => {
    const s = repere(100, 100);
    const zone: Quad = [{ x: 20, y: 30 }, { x: 60, y: 30 }, { x: 60, y: 70 }, { x: 20, y: 70 }];
    const r = redresser(s, zone, 40, 40)!;
    expect(px(r, 0, 0)[0]).toBeCloseTo(20, -1);
    expect(px(r, 0, 0)[1]).toBeCloseTo(30, -1);
    expect(px(r, 39, 39)[0]).toBeGreaterThanOrEqual(58);
    expect(px(r, 39, 39)[1]).toBeGreaterThanOrEqual(68);
  });
  it('redressement : un trapèze (feuille vue en perspective) devient un rectangle', () => {
    // Une feuille blanche (255) sur fond noir, vue de biais : haut plus étroit que le bas.
    const w = 200;
    const h = 200;
    const data = new Uint8ClampedArray(w * h * 4).fill(0);
    const feuille: Quad = [{ x: 60, y: 20 }, { x: 140, y: 20 }, { x: 180, y: 180 }, { x: 20, y: 180 }];
    for (let y = 20; y < 180; y++) {
      const t = (y - 20) / 160;
      const g = 60 - 40 * t;
      const d = 140 + 40 * t;
      for (let x = Math.ceil(g); x < d; x++) {
        const o = (y * w + x) * 4;
        data[o] = data[o + 1] = data[o + 2] = 255;
        data[o + 3] = 255;
      }
    }
    for (let i = 3; i < data.length; i += 4) data[i] = 255;
    const sortie = redresser({ data, width: w, height: h }, feuille, 100, 160)!;
    // Quasi tout le rectangle de sortie est de la feuille (blanc), y compris près des coins.
    let blancs = 0;
    for (let y = 0; y < 160; y++) for (let x = 0; x < 100; x++) if (sortie.data[(y * 100 + x) * 4] > 200) blancs++;
    expect(blancs / (100 * 160)).toBeGreaterThan(0.97);
  });
  it('quadrilatère dégénéré : null', () => {
    const plat: Quad = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 0 }, { x: 30, y: 0 }];
    expect(redresser(repere(40, 30), plat, 10, 10)).toBeNull();
  });
});

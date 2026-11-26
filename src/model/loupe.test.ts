import { describe, expect, it } from 'vitest';
import { centrerLoupe, destination, zoneAgrandie } from './loupe';

describe('loupe', () => {
  it('la zone agrandie est centrée, de côté diamètre / facteur', () => {
    expect(zoneAgrandie(100, 80, 200, 2)).toEqual({ x: 50, y: 30, cote: 100 });
  });
  it('un point au centre de la zone tombe au centre de la loupe, quel que soit le facteur', () => {
    for (const f of [2, 3, 4]) {
      const d = destination(100, 80, 0, 0, 100, 80, 200, f);
      expect(d.x).toBe(100);
      expect(d.y).toBe(100);
    }
  });
  it('un élément est agrandi du facteur, autour du centre', () => {
    const d = destination(90, 70, 20, 10, 100, 80, 200, 3);
    expect(d).toEqual({ x: 70, y: 70, l: 60, h: 30 });
  });
  it('centrer : au milieu de la partie visible', () => {
    const r = centrerLoupe({ left: 256, top: 300, width: 476, height: 674 }, { gauche: 250, droite: 740, haut: 200, bas: 900 }, 210, 297);
    expect(r.x).toBeCloseTo(105, 0);
    // Partie visible de la page : de y = 300 (haut de la page) à y = 900 (bas de l'écran), milieu 600 px, soit 300 px sous le haut ≈ 132 mm.
    expect(r.y).toBeCloseTo(300 / (476 / 210), 5);
  });
  it('centrer : reste dans la page', () => {
    const r = centrerLoupe({ left: 0, top: 0, width: 210, height: 297 }, { gauche: -500, droite: -400, haut: -500, bas: -400 }, 210, 297);
    expect(r.x).toBeGreaterThanOrEqual(5);
    expect(r.y).toBeGreaterThanOrEqual(5);
  });
});

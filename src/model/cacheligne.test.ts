import { describe, expect, it } from 'vitest';
import { borneY, hauteurFenetre, yInitial } from './cacheligne';

describe('cache-ligne', () => {
  it('une ligne = 10 mm', () => {
    expect(hauteurFenetre(1)).toBe(10);
    expect(hauteurFenetre(3)).toBe(30);
  });
  it('la fenêtre reste dans la page', () => {
    expect(borneY(-5, 2, 297)).toBe(0);
    expect(borneY(100, 2, 297)).toBe(100);
    expect(borneY(400, 2, 297)).toBe(277); // 297 - 20
    expect(borneY(400, 3, 297)).toBe(267);
  });
  it('pose de départ : fenêtre centrée sur la partie visible, dans la page', () => {
    const y = yInitial({ left: 0, top: 0, width: 210, height: 297 }, { gauche: 0, droite: 210, haut: 0, bas: 200 }, 210, 297, 2);
    expect(y).toBeCloseTo(90, 5); // milieu 100 mm, fenêtre de 20 mm
    const bas = yInitial({ left: 0, top: -1000, width: 210, height: 297 }, { gauche: 0, droite: 210, haut: 0, bas: 100 }, 210, 297, 3);
    expect(bas).toBeGreaterThanOrEqual(0);
    expect(bas).toBeLessThanOrEqual(297 - 30);
  });
});

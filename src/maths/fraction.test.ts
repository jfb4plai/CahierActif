import { describe, it, expect } from 'vitest';
import { ptVersMm } from '../lib/units';
import { creerFraction, geometrieFraction, TAILLE_FRACTION_PT } from './fraction';

describe('fraction', () => {
  it('creerFraction : vide, 16 pt', () => {
    const f = creerFraction(5, 6, '#1d4ed8');
    expect(f).toMatchObject({ type: 'fraction', x: 5, y: 6, numerateur: '', denominateur: '', taillePt: TAILLE_FRACTION_PT, couleur: '#1d4ed8' });
    expect(TAILLE_FRACTION_PT).toBe(16);
  });

  it('géométrie : largeur selon le plus long terme, barre entre les deux', () => {
    const f = { ...creerFraction(0, 0, '#000000'), numerateur: '12', denominateur: '345' };
    const g = geometrieFraction(f);
    const t = ptVersMm(16);
    expect(g.largeur).toBeCloseTo(3 * 0.6 * t + 3, 6);
    expect(g.numerateur.y).toBe(0);
    expect(g.barreY).toBeCloseTo(1.3 * t + 0.5, 6);
    expect(g.denominateur.y).toBeCloseTo(1.3 * t + 1, 6);
    expect(g.hauteur).toBeCloseTo(2 * 1.3 * t + 1, 6);
  });

  it('fraction vide : largeur d’un caractère', () => {
    const g = geometrieFraction(creerFraction(0, 0, '#000000'));
    expect(g.largeur).toBeCloseTo(0.6 * ptVersMm(16) + 3, 6);
  });
});

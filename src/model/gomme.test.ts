import { describe, it, expect } from 'vitest';
import type { Trait, Texte } from './types';
import { distPointSegment, objetTouche, effacerPartiel, densifier, hauteurTexte } from './gomme';

const trait = (pts: [number, number][], epaisseur = 1): Trait => ({
  id: 't', type: 'trait', points: pts.map(([x, y]) => ({ x, y })), couleur: '#000000', epaisseur,
});

describe('gomme', () => {
  it('distance point-segment', () => {
    expect(distPointSegment({ x: 5, y: 3 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBeCloseTo(3);
    expect(distPointSegment({ x: -4, y: 3 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBeCloseTo(5);
  });

  it('un trait est touché si la gomme est à moins de rayon + demi-épaisseur', () => {
    const t = trait([[0, 0], [10, 0]], 2);
    expect(objetTouche(t, { x: 5, y: 3.9 }, 3)).toBe(true);
    expect(objetTouche(t, { x: 5, y: 4.1 }, 3)).toBe(false);
  });

  it('un trait d’un seul point est touchable', () => {
    expect(objetTouche(trait([[5, 5]]), { x: 6, y: 5 }, 1)).toBe(true);
  });

  it('un texte est touché dans son cadre', () => {
    const tx: Texte = { id: 'x', type: 'texte', x: 10, y: 10, largeur: 50, texte: 'a\nb', taillePt: 14, couleur: '#000000' };
    expect(hauteurTexte(tx)).toBeCloseTo(2 * 14 * (25.4 / 72) * 1.5, 6);
    expect(objetTouche(tx, { x: 30, y: 15 }, 0)).toBe(true);
    expect(objetTouche(tx, { x: 70, y: 15 }, 0)).toBe(false);
  });

  it('densifier ajoute des points tous les pasMm au plus', () => {
    const pts = densifier([{ x: 0, y: 0 }, { x: 10, y: 0 }], 1);
    expect(pts).toHaveLength(11);
    expect(pts[5].x).toBeCloseTo(5);
  });

  it('effacer au milieu coupe le trait en deux', () => {
    let n = 0;
    const res = effacerPartiel(trait([[0, 0], [20, 0]]), { x: 10, y: 0 }, 2, () => `n${n++}`);
    expect(res).toHaveLength(2);
    expect(Math.max(...res[0].points.map(p => p.x))).toBeLessThan(8.1);
    expect(Math.min(...res[1].points.map(p => p.x))).toBeGreaterThan(11.9);
    expect(res.map(r => r.id)).toEqual(['n0', 'n1']);
  });

  it('effacer loin du trait le rend intact (même objet)', () => {
    const t = trait([[0, 0], [20, 0]]);
    const res = effacerPartiel(t, { x: 10, y: 50 }, 2, () => 'x');
    expect(res).toEqual([t]);
  });

  it('effacer tout le trait ne laisse rien', () => {
    const res = effacerPartiel(trait([[0, 0], [1, 0]]), { x: 0.5, y: 0 }, 5, () => 'x');
    expect(res).toEqual([]);
  });
});

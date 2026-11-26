import { describe, expect, it } from 'vitest';
import { lisserTrait, RAYON_LISSAGE } from './lissage';

// Ligne droite (y = 0) avec un bruit déterministe, comme une main qui tremble.
const ligneTremblee = Array.from({ length: 41 }, (_, i) => ({ x: i, y: (((i * 37) % 11) - 5) / 5 }));

describe('lisserTrait', () => {
  it('ne change rien sans lissage ni pour 2 points ou moins', () => {
    expect(lisserTrait(ligneTremblee, 0)).toBe(ligneTremblee);
    const deux = [{ x: 0, y: 0 }, { x: 5, y: 5 }];
    expect(lisserTrait(deux, 8)).toBe(deux);
  });
  it('garde exactement le premier et le dernier point', () => {
    const r = lisserTrait(ligneTremblee, RAYON_LISSAGE.fort);
    expect(r[0]).toEqual(ligneTremblee[0]);
    expect(r[40]).toEqual(ligneTremblee[40]);
    expect(r).toHaveLength(41);
  });
  it('réduit le tremblement', () => {
    // Écart quadratique à la droite idéale, sur le milieu du trait (loin des bouts fixes).
    const ecart = (pts: { y: number }[]) => Math.sqrt(pts.slice(10, 30).reduce((a, q) => a + q.y * q.y, 0) / 20);
    const leger = lisserTrait(ligneTremblee, RAYON_LISSAGE.leger);
    const fort = lisserTrait(ligneTremblee, RAYON_LISSAGE.fort);
    expect(ecart(leger)).toBeLessThan(ecart(ligneTremblee));
    expect(ecart(fort)).toBeLessThan(ecart(leger));
  });
  it('laisse une droite parfaite inchangée', () => {
    const droite = Array.from({ length: 20 }, (_, i) => ({ x: i, y: 2 * i }));
    for (const q of lisserTrait(droite, 5).map((q, i) => [q, droite[i]] as const)) {
      expect(q[0].x).toBeCloseTo(q[1].x, 9);
      expect(q[0].y).toBeCloseTo(q[1].y, 9);
    }
  });
  it('moyenne la pression seulement si tous les points en ont une', () => {
    const avec = Array.from({ length: 9 }, (_, i) => ({ x: i, y: 0, p: i / 8 }));
    expect(lisserTrait(avec, 2)[4].p).toBeCloseTo(0.5, 9);
    const sans = avec.map((q, i) => (i === 4 ? { x: q.x, y: q.y } : q));
    expect(lisserTrait(sans, 2)[3].p).toBeUndefined();
  });
});

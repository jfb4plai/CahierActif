import { describe, expect, it } from 'vitest';
import { angleVersPoignee, areteProche, aretes, dansContour, longueurCm, poigneePage, projeter, sommets, versPage, type Instrument } from './instruments';

const regle = (x = 100, y = 100, angle = 0): Instrument => ({ id: 'regle', page: 0, x, y, angle });
const equerre = (x = 100, y = 100, angle = 0): Instrument => ({ id: 'equerre', page: 0, x, y, angle });

describe('instruments', () => {
  it('règle à plat : 200 mm sur 34 mm autour du pivot', () => {
    const [a, b, c] = sommets(regle());
    expect(a).toEqual({ x: 0, y: 83 });
    expect(b).toEqual({ x: 200, y: 83 });
    expect(c).toEqual({ x: 200, y: 117 });
  });
  it('tourner de 90° (sens horaire) met le haut de la règle à droite', () => {
    const [a, b] = sommets(regle(100, 100, 90));
    expect(a.x).toBeCloseTo(117, 9);
    expect(a.y).toBeCloseTo(0, 9);
    expect(b.y).toBeCloseTo(200, 9);
  });
  it('équerre : angle droit à 90°, côtés de 150 mm', () => {
    const [o, h, v] = sommets(equerre());
    expect(Math.hypot(h.x - o.x, h.y - o.y)).toBeCloseTo(150, 9);
    expect(Math.hypot(v.x - o.x, v.y - o.y)).toBeCloseTo(150, 9);
    expect((h.x - o.x) * (v.x - o.x) + (h.y - o.y) * (v.y - o.y)).toBeCloseTo(0, 9);
  });
  it('arêtes : règle 2, équerre 3', () => {
    expect(aretes(regle())).toHaveLength(2);
    expect(aretes(equerre())).toHaveLength(3);
  });
  it('projeter garde le point dans le segment', () => {
    const r = projeter({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 15, y: 3 });
    expect(r.p).toEqual({ x: 10, y: 0 });
    expect(r.distance).toBeCloseTo(Math.hypot(5, 3), 9);
  });
  it('areteProche : dans la bande seulement, la plus proche gagne', () => {
    const r = regle();
    expect(areteProche([r], { x: 100, y: 85 }, 3)?.a).toEqual({ x: 0, y: 83 }); // à 2 mm du bord du haut
    expect(areteProche([r], { x: 100, y: 100 }, 3)).toBeNull(); // au milieu de la règle
    expect(areteProche([r], { x: 100, y: 60 }, 3)).toBeNull(); // loin
  });
  it('dansContour', () => {
    expect(dansContour(regle(), { x: 100, y: 100 })).toBe(true);
    expect(dansContour(regle(), { x: 100, y: 130 })).toBe(false);
    expect(dansContour(equerre(), { x: 100, y: 100 })).toBe(true);
    expect(dansContour(equerre(), { x: 190, y: 190 })).toBe(false); // au-delà de l'hypoténuse
  });
  it('la poignée suit la souris : après rotation, elle pointe vers q', () => {
    for (const base of [regle(), equerre()]) {
      const q = { x: base.x + 80, y: base.y - 120 };
      const apres = { ...base, angle: angleVersPoignee(base, q) };
      const h = poigneePage(apres);
      const dirH = Math.atan2(h.y - apres.y, h.x - apres.x);
      const dirQ = Math.atan2(q.y - apres.y, q.x - apres.x);
      expect(dirH).toBeCloseTo(dirQ, 9);
    }
  });
  it('versPage avec angle 0 est une translation', () => {
    expect(versPage(regle(10, 20, 0), { x: 1, y: 2 })).toEqual({ x: 11, y: 22 });
  });
  it('longueur en cm, virgule française', () => {
    expect(longueurCm(123)).toBe('12,3 cm');
    expect(longueurCm(0)).toBe('0,0 cm');
  });
});

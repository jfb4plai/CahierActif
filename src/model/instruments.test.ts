import { describe, expect, it } from 'vitest';
import { angleVersPoignee, arc, areteProche, aretes, crayonPage, creerInstrument, dansContour, ecartAngle, longueurCm, poigneePage, projeter, rayonValide, sommets, versPage, type Instrument } from './instruments';

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

  it('rapporteur : demi-disque de 75 mm, base le long de y = pivot', () => {
    const r: Instrument = { id: 'rapporteur', page: 0, x: 100, y: 100, angle: 0 };
    const v = sommets(r);
    expect(v[0].x).toBeCloseTo(25, 9);
    expect(v[0].y).toBeCloseTo(100, 9);
    expect(v[36].x).toBeCloseTo(175, 9);
    expect(v[18].x).toBeCloseTo(100, 9);
    expect(v[18].y).toBeCloseTo(25, 9); // sommet de l'arc, au-dessus
    expect(aretes(r)).toHaveLength(1);
    expect(dansContour(r, { x: 100, y: 60 })).toBe(true);
    expect(dansContour(r, { x: 100, y: 120 })).toBe(false); // sous la base
    expect(areteProche([r], { x: 100, y: 102 }, 3)?.a.x).toBeCloseTo(25, 9);
  });
  it('compas : la mine est à l’écartement de la pointe, dans la direction de l’angle', () => {
    const c = { ...creerInstrument('compas', 0, 210), x: 50, y: 60, rayon: 30, angle: 90 };
    const m = crayonPage(c);
    expect(m.x).toBeCloseTo(50, 9);
    expect(m.y).toBeCloseTo(90, 9);
    expect(aretes(c)).toHaveLength(0);
    expect(creerInstrument('compas', 0, 210).rayon).toBe(40);
  });
  it('écartement borné et arrondi au dixième de mm', () => {
    expect(rayonValide(2)).toBe(5);
    expect(rayonValide(500)).toBe(140);
    expect(rayonValide(47.26)).toBe(47.3);
  });
  it('ecartAngle ne saute pas quand on franchit ±π', () => {
    expect(ecartAngle(3.1, -3.1)).toBeCloseTo(2 * Math.PI - 6.2, 9);
    expect(ecartAngle(0, 0.5)).toBeCloseTo(0.5, 9);
  });
  it('arc : tous les points sont à la distance r du centre, bouts exacts', () => {
    const pts = arc({ x: 10, y: 20 }, 15, 0, Math.PI);
    for (const q of pts) expect(Math.hypot(q.x - 10, q.y - 20)).toBeCloseTo(15, 9);
    expect(pts[0].x).toBeCloseTo(25, 9);
    expect(pts.at(-1)!.x).toBeCloseTo(-5, 9);
    expect(pts.length).toBeGreaterThanOrEqual(90);
  });
  it('un tour complet ferme le cercle', () => {
    const pts = arc({ x: 0, y: 0 }, 10, 0, 2 * Math.PI);
    expect(pts.at(-1)!.x).toBeCloseTo(pts[0].x, 9);
    expect(pts.at(-1)!.y).toBeCloseTo(pts[0].y, 9);
  });
});

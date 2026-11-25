import { describe, it, expect } from 'vitest';
import { FORMES, boiteForme, cheminsLocaux, cheminsPage, defForme, formeContient, formeDepuisGlisse, formeTouchee } from './formes';
import { objetTouche } from './gomme';
import { boiteObjet } from './boites';
import type { Forme } from './types';

const rect = (p: Partial<Forme> = {}): Forme => ({
  id: 'f', type: 'forme', forme: 'rectangle', x: 10, y: 20, largeur: 40, hauteur: 20, rotation: 0, couleur: '#000000', epaisseur: 0.8, ...p,
});

describe('catalogue', () => {
  it('contient les 7 formes demandées, chacune avec au moins un chemin', () => {
    expect(FORMES.map(f => f.id)).toEqual(['ligne', 'rond', 'carre', 'rectangle', 'triangle', 'fleche-gauche', 'fleche-droite']);
    for (const f of FORMES) expect(f.chemins.length).toBeGreaterThan(0);
  });
  it('forme inconnue : erreur', () => {
    expect(() => defForme('hexagone' as never)).toThrow(RangeError);
  });
  it('la flèche gauche est le miroir de la flèche droite', () => {
    const d = cheminsLocaux(rect({ forme: 'fleche-droite' }));
    const g = cheminsLocaux(rect({ forme: 'fleche-gauche' }));
    expect(g[0].pts[0].x).toBeCloseTo(40 - d[0].pts[0].x);
    expect(g[0].pts[0].y).toBeCloseTo(d[0].pts[0].y);
  });
});

describe('géométrie', () => {
  it('rectangle : 4 coins à l’échelle de la boîte', () => {
    expect(cheminsLocaux(rect())[0].pts).toEqual([{ x: 0, y: 0 }, { x: 40, y: 0 }, { x: 40, y: 20 }, { x: 0, y: 20 }]);
  });
  it('inverse : retourne de haut en bas', () => {
    const t = cheminsLocaux(rect({ forme: 'triangle', inverse: true }))[0].pts;
    expect(t[0]).toEqual({ x: 20, y: 20 });
  });
  it('rotation de 90° autour du coin haut-gauche', () => {
    const pts = cheminsPage(rect({ rotation: 90 }))[0].pts;
    expect(pts[1].x).toBeCloseTo(10);
    expect(pts[1].y).toBeCloseTo(60);
  });
  it('boîte englobante après rotation', () => {
    const b = boiteForme(rect({ rotation: 90 }));
    expect(b.x).toBeCloseTo(-10);
    expect(b.y).toBeCloseTo(20);
    expect(b.largeur).toBeCloseTo(20);
    expect(b.hauteur).toBeCloseTo(40);
    expect(boiteObjet(rect({ rotation: 90 })).largeur).toBeCloseTo(20);
  });
});

describe('toucher', () => {
  it('gomme : touche le contour, pas l’intérieur', () => {
    const f = rect();
    expect(formeTouchee(f, { x: 30, y: 20 }, 1)).toBe(true); // bord haut
    expect(formeTouchee(f, { x: 30, y: 30 }, 1)).toBe(false); // centre
    expect(objetTouche(f, { x: 30, y: 30 }, 1)).toBe(false);
    expect(objetTouche(f, { x: 30, y: 20 }, 1)).toBe(true);
  });
  it('gomme : suit la rotation', () => {
    const f = rect({ rotation: 90 }); // le bord haut devient vertical, x = 10
    expect(formeTouchee(f, { x: 10, y: 40 }, 1)).toBe(true);
    expect(formeTouchee(f, { x: 30, y: 20 }, 1)).toBe(false);
  });
  it('sélection : tout l’intérieur de la boîte', () => {
    expect(formeContient(rect(), { x: 30, y: 30 }, 1)).toBe(true);
    expect(formeContient(rect(), { x: 80, y: 30 }, 1)).toBe(false);
  });
  it('ligne : le contour seul est touché', () => {
    const l = rect({ forme: 'ligne' });
    expect(formeTouchee(l, { x: 30, y: 30 }, 1)).toBe(true); // milieu de la diagonale
    expect(formeTouchee(l, { x: 45, y: 22 }, 1)).toBe(false);
  });
});

describe('formeDepuisGlisse', () => {
  const a = { x: 10, y: 10 };
  it('trop court : rien', () => {
    expect(formeDepuisGlisse('rectangle', a, { x: 11, y: 11 }, '#000000', 0.8)).toBeNull();
  });
  it('rectangle : boîte entre les deux points, quel que soit le sens', () => {
    const f = formeDepuisGlisse('rectangle', { x: 50, y: 40 }, { x: 10, y: 10 }, '#dc2626', 1.6)!;
    expect(f).toMatchObject({ type: 'forme', forme: 'rectangle', x: 10, y: 10, largeur: 40, hauteur: 30, rotation: 0, couleur: '#dc2626', epaisseur: 1.6 });
    expect(f.inverse).toBeUndefined();
  });
  it('carré et rond : côté égal, dans le sens du glissé', () => {
    const c = formeDepuisGlisse('carre', a, { x: 50, y: 30 }, '#000000', 0.8)!;
    expect([c.largeur, c.hauteur]).toEqual([40, 40]);
    const r = formeDepuisGlisse('rond', { x: 50, y: 50 }, { x: 40, y: 10 }, '#000000', 0.8)!;
    expect([r.x, r.y, r.largeur, r.hauteur]).toEqual([10, 10, 40, 40]);
  });
  it('ligne montante : inverse', () => {
    expect(formeDepuisGlisse('ligne', { x: 10, y: 50 }, { x: 50, y: 10 }, '#000000', 0.8)!.inverse).toBe(true);
    expect(formeDepuisGlisse('ligne', a, { x: 50, y: 50 }, '#000000', 0.8)!.inverse).toBeUndefined();
  });
  it('ligne horizontale : hauteur nulle, acceptée', () => {
    const l = formeDepuisGlisse('ligne', a, { x: 60, y: 10 }, '#000000', 0.8)!;
    expect(l.hauteur).toBe(0);
    expect(l.largeur).toBe(50);
  });
});

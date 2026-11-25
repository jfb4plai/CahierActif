import { describe, it, expect } from 'vitest';
import {
  MARGE_MM, creerRepere, parametresValides, geometrieRepere, versMm, versUnites, ajouterPoint,
  supprimerPoint, nomSuivant, etiquettePoint, formatNombre, lireBorne,
  ajouterDroite, supprimerDroite, extremitesDroite, nomDroite,
} from './repere';

const r0 = () => creerRepere(20, 30, { xmin: -2, xmax: 4, ymin: -1, ymax: 3, uniteMm: 10 }, '#000000');

describe('repere', () => {
  it('paramètres : 0 compris, entiers, taille maximale', () => {
    expect(parametresValides({ xmin: -5, xmax: 5, ymin: -5, ymax: 5, uniteMm: 10 })).toBeNull();
    expect(parametresValides({ xmin: 1, xmax: 5, ymin: -5, ymax: 5, uniteMm: 10 })).toMatch(/0/);
    expect(parametresValides({ xmin: -1.5, xmax: 5, ymin: -5, ymax: 5, uniteMm: 10 })).toMatch(/entiers/);
    expect(parametresValides({ xmin: -10, xmax: 10, ymin: -5, ymax: 5, uniteMm: 10 })).toMatch(/dépasse/);
    expect(parametresValides({ xmin: -5, xmax: 5, ymin: -5, ymax: 5, uniteMm: 7 })).toMatch(/unité/);
  });

  it('géométrie : marges, origine, graduations entières', () => {
    const g = geometrieRepere(r0());
    expect(g.largeur).toBe(6 * 10 + 2 * MARGE_MM);
    expect(g.hauteur).toBe(4 * 10 + 2 * MARGE_MM);
    expect(g.origine).toEqual({ x: 20 + MARGE_MM + 2 * 10, y: 30 + MARGE_MM + 3 * 10 }); // (0 ; 0) : 2 unités après xmin, 3 sous ymax
    expect(g.graduationsX.map(t => t.valeur)).toEqual([-2, -1, 0, 1, 2, 3, 4]);
    expect(g.graduationsY.map(t => t.valeur)).toEqual([-1, 0, 1, 2, 3]);
  });

  it('conversions mm ↔ unités (absolues sur la page)', () => {
    const r = r0();
    const p = versMm(r, 2, 1);
    expect(p).toEqual({ x: 20 + MARGE_MM + 40, y: 30 + MARGE_MM + 20 });
    const u = versUnites(r, p.x, p.y);
    expect(u.x).toBeCloseTo(2);
    expect(u.y).toBeCloseTo(1);
  });

  it('ajouterPoint : arrondi à la demi-unité, nom suivant, hors repère ignoré, doublon ignoré', () => {
    let r = r0();
    const p = versMm(r, 1.3, 2.2);
    r = ajouterPoint(r, p.x, p.y);
    expect(r.points).toEqual([{ nom: 'A', x: 1.5, y: 2 }]);
    expect(ajouterPoint(r, p.x, p.y)).toBe(r);
    const loin = versMm(r, 10, 10);
    expect(ajouterPoint(r, loin.x, loin.y)).toBe(r);
    const q = versMm(r, -1, -1);
    r = ajouterPoint(r, q.x, q.y);
    expect(r.points.map(pt => pt.nom)).toEqual(['A', 'B']);
  });

  it('supprimerPoint et nomSuivant réutilise une lettre libérée', () => {
    let r = r0();
    for (const [x, y] of [[0, 0], [1, 1], [2, 2]]) { const p = versMm(r, x, y); r = ajouterPoint(r, p.x, p.y); }
    r = supprimerPoint(r, 'B');
    expect(nomSuivant(r.points)).toBe('B');
  });

  it('étiquettes à la belge : virgule décimale, point-virgule', () => {
    expect(formatNombre(2.5)).toBe('2,5');
    expect(formatNombre(-3)).toBe('-3');
    expect(etiquettePoint({ nom: 'A', x: 2, y: 3.5 })).toBe('A(2 ; 3,5)');
  });

  it('borne saisie : signe moins, vide et texte illisible', () => {
    expect(lireBorne('-5')).toBe(-5);
    expect(lireBorne(' −3 ')).toBe(-3); // moins typographique
    expect(lireBorne('4')).toBe(4);
    expect(Number.isNaN(lireBorne(''))).toBe(true);
    expect(Number.isNaN(lireBorne('-'))).toBe(true);
    expect(Number.isNaN(lireBorne('a'))).toBe(true);
    expect(parametresValides({ xmin: lireBorne(''), xmax: 5, ymin: -5, ymax: 5, uniteMm: 10 })).not.toBeNull();
  });
});

describe('droites par deux points', () => {
  // Repère -5..5 × -5..5, unité 10 mm, placé en (0, 0) : l'origine est à (6 + 50, 6 + 50) mm.
  const base = () => creerRepere(0, 0, { xmin: -5, xmax: 5, ymin: -5, ymax: 5, uniteMm: 10 }, '#000000');
  const avec = (...pts: [number, number][]) => {
    let r = base();
    for (const [x, y] of pts) r = { ...r, points: [...r.points, { nom: String.fromCharCode(65 + r.points.length), x, y }] };
    return r;
  };

  it('ajouterDroite : deux points connus et distincts', () => {
    const r = ajouterDroite(avec([0, 1], [1, 3]), 'A', 'B');
    expect(r.droites).toEqual([{ a: 'A', b: 'B' }]);
  });
  it('ajouterDroite : point inconnu, même point, doublon (AB = BA) → repère inchangé', () => {
    const r = avec([0, 1], [1, 3]);
    expect(ajouterDroite(r, 'A', 'Z')).toBe(r);
    expect(ajouterDroite(r, 'A', 'A')).toBe(r);
    const une = ajouterDroite(r, 'A', 'B');
    expect(ajouterDroite(une, 'B', 'A')).toBe(une);
  });
  it('supprimerDroite et supprimerPoint (qui supprime aussi les droites du point)', () => {
    const r = ajouterDroite(ajouterDroite(avec([0, 1], [1, 3], [2, 5]), 'A', 'B'), 'B', 'C');
    expect(supprimerDroite(r, 'A', 'B').droites).toEqual([{ a: 'B', b: 'C' }]);
    expect(supprimerPoint(r, 'B').droites).toEqual([]);
    expect(supprimerPoint(r, 'C').droites).toEqual([{ a: 'A', b: 'B' }]);
  });
  it('document sans droites : supprimerPoint n’en crée pas', () => {
    expect(supprimerPoint(avec([0, 1]), 'A').droites).toBeUndefined();
  });
  it('nomDroite', () => {
    expect(nomDroite({ a: 'A', b: 'B' })).toBe('(AB)');
  });

  it('y = 2x + 1 : prolongée jusqu’aux bords du quadrillage', () => {
    // A(0 ; 1), B(1 ; 3). En haut y = 5 → x = 2 ; en bas y = -5 → x = -3.
    const e = extremitesDroite(avec([0, 1], [1, 3]), 'A', 'B')!;
    const haut = versMm(base(), 2, 5);
    const bas = versMm(base(), -3, -5);
    const [p, q] = [e.y1 < e.y2 ? { x: e.x1, y: e.y1 } : { x: e.x2, y: e.y2 }, e.y1 < e.y2 ? { x: e.x2, y: e.y2 } : { x: e.x1, y: e.y1 }];
    expect(p.x).toBeCloseTo(haut.x); expect(p.y).toBeCloseTo(haut.y);
    expect(q.x).toBeCloseTo(bas.x); expect(q.y).toBeCloseTo(bas.y);
  });
  it('droite horizontale et verticale : d’un bord à l’autre', () => {
    const h = extremitesDroite(avec([-1, 2], [3, 2]), 'A', 'B')!;
    expect(Math.abs(h.x2 - h.x1)).toBeCloseTo(100);
    expect(h.y1).toBeCloseTo(h.y2);
    const v = extremitesDroite(avec([2, -1], [2, 4]), 'A', 'B')!;
    expect(Math.abs(v.y2 - v.y1)).toBeCloseTo(100);
    expect(v.x1).toBeCloseTo(v.x2);
  });
  it('points sur le bord du quadrillage : la droite s’y arrête', () => {
    const e = extremitesDroite(avec([-5, -5], [5, 5]), 'A', 'B')!;
    expect(Math.hypot(e.x2 - e.x1, e.y2 - e.y1)).toBeCloseTo(Math.hypot(100, 100));
  });
  it('point manquant ou points confondus : null', () => {
    expect(extremitesDroite(avec([0, 1]), 'A', 'B')).toBeNull();
    expect(extremitesDroite(avec([0, 1], [0, 1]), 'A', 'B')).toBeNull();
  });
});

import { describe, it, expect } from 'vitest';
import {
  MARGE_MM, creerRepere, parametresValides, geometrieRepere, versMm, versUnites, ajouterPoint,
  supprimerPoint, nomSuivant, etiquettePoint, formatNombre,
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
});

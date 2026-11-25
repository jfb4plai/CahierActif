import { describe, it, expect } from 'vitest';
import { creerDroite, distPointDroite, droiteSurPage, prolongerDansRect } from './droites';
import { objetTouche } from './gomme';
import { deplacerObjet, ajouterObjet, nouveauDocVierge } from './ops';
import { boiteObjet } from './boites';
import type { Droite } from './types';

describe('prolongerDansRect', () => {
  it('diagonale : d’un coin à l’autre', () => {
    const s = prolongerDansRect({ x: 20, y: 20 }, { x: 40, y: 40 }, 0, 100, 0, 100)!;
    expect([s.x1, s.y1, s.x2, s.y2].map(Math.round)).toEqual([0, 0, 100, 100]);
  });
  it('horizontale et verticale', () => {
    const h = prolongerDansRect({ x: 10, y: 30 }, { x: 20, y: 30 }, 0, 210, 0, 297)!;
    expect([h.x1, h.y1, h.x2, h.y2]).toEqual([0, 30, 210, 30]);
    const v = prolongerDansRect({ x: 50, y: 10 }, { x: 50, y: 20 }, 0, 210, 0, 297)!;
    expect([v.x1, v.y1, v.x2, v.y2]).toEqual([50, 0, 50, 297]);
  });
  it('pente quelconque : les deux extrémités sont sur le bord et sur la droite', () => {
    const a = { x: 30, y: 60 };
    const b = { x: 60, y: 30 };
    const s = prolongerDansRect(a, b, 0, 210, 0, 297)!;
    for (const [x, y] of [[s.x1, s.y1], [s.x2, s.y2]]) {
      expect(distPointDroite({ x, y }, a, b)).toBeCloseTo(0);
      expect(x === 0 || x === 210 || y === 0 || y === 297 || Math.abs(x) < 1e-9 || Math.abs(y) < 1e-9).toBe(true);
    }
  });
  it('points confondus : null', () => {
    expect(prolongerDansRect({ x: 5, y: 5 }, { x: 5, y: 5 }, 0, 10, 0, 10)).toBeNull();
  });
  it('droite hors du rectangle : null', () => {
    expect(prolongerDansRect({ x: 0, y: 50 }, { x: 10, y: 50 }, 0, 10, 0, 10)).toBeNull();
  });
});

describe('distPointDroite', () => {
  it('distance à la droite infinie, au-delà des points aussi', () => {
    expect(distPointDroite({ x: 100, y: 3 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBeCloseTo(3);
  });
  it('points confondus : distance au point', () => {
    expect(distPointDroite({ x: 3, y: 4 }, { x: 0, y: 0 }, { x: 0, y: 0 })).toBeCloseTo(5);
  });
});

describe('creerDroite', () => {
  it('trop proches : null', () => {
    expect(creerDroite({ x: 0, y: 0 }, { x: 1, y: 1 }, '#000000', 0.8)).toBeNull();
  });
  it('crée une droite par les deux points', () => {
    const d = creerDroite({ x: 10, y: 10 }, { x: 50, y: 30 }, '#dc2626', 1.6)!;
    expect(d).toMatchObject({ type: 'droite', a: { x: 10, y: 10 }, b: { x: 50, y: 30 }, couleur: '#dc2626', epaisseur: 1.6 });
  });
  it('droiteSurPage : segment de bord à bord passant par A et B', () => {
    const d = creerDroite({ x: 10, y: 10 }, { x: 50, y: 30 }, '#000000', 0.8)!;
    const s = droiteSurPage(d, 210, 297)!;
    expect(distPointDroite({ x: s.x1, y: s.y1 }, d.a, d.b)).toBeCloseTo(0);
    expect(distPointDroite({ x: s.x2, y: s.y2 }, d.a, d.b)).toBeCloseTo(0);
  });
});

describe('droite dans le modèle', () => {
  const d: Droite = { id: 'd', type: 'droite', a: { x: 10, y: 10 }, b: { x: 50, y: 30 }, couleur: '#000000', epaisseur: 0.8 };
  it('gomme : touche la droite tout du long', () => {
    expect(objetTouche(d, { x: 30, y: 20 }, 1)).toBe(true);
    expect(objetTouche(d, { x: 90, y: 50 }, 1)).toBe(true); // au-delà de B, sur le prolongement
    expect(objetTouche(d, { x: 30, y: 50 }, 1)).toBe(false);
  });
  it('boîte : celle des deux points', () => {
    expect(boiteObjet(d)).toEqual({ x: 10, y: 10, largeur: 40, hauteur: 20 });
  });
  it('deplacerObjet décale les deux points', () => {
    const doc = deplacerObjet(ajouterObjet(nouveauDocVierge('E', 'p3p6'), 0, d), 0, 'd', 5, -3);
    const o = doc.pages[0].objets[0] as Droite;
    expect(o.a).toEqual({ x: 15, y: 7 });
    expect(o.b).toEqual({ x: 55, y: 27 });
  });
});

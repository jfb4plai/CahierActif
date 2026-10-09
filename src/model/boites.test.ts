import { describe, it, expect } from 'vitest';
import { boiteObjet } from './boites';
import { objetTouche } from './gomme';
import { creerOperation, geometrieOperation } from '../maths/operation';
import { creerFraction, geometrieFraction } from '../maths/fraction';
import { creerRepere, geometrieRepere } from '../maths/repere';
import type { Expression, Texte } from './types';

describe('boites', () => {
  it('opération, fraction, repère : boîte = géométrie à la position de l’objet', () => {
    const o = creerOperation(10, 20, { operateur: '+', colonnes: 3, lignes: 3, virgule: null, chiffresDiviseur: 1, couleurs: true }, '#000000');
    const g = geometrieOperation(o);
    expect(boiteObjet(o)).toEqual({ x: 10, y: 20, largeur: g.largeur, hauteur: g.hauteur });
    const f = creerFraction(1, 2, '#000000');
    expect(boiteObjet(f)).toEqual({ x: 1, y: 2, largeur: geometrieFraction(f).largeur, hauteur: geometrieFraction(f).hauteur });
    const r = creerRepere(3, 4, { xmin: -1, xmax: 1, ymin: -1, ymax: 1, uniteMm: 10 }, '#000000');
    expect(boiteObjet(r)).toEqual({ x: 3, y: 4, largeur: geometrieRepere(r).largeur, hauteur: geometrieRepere(r).hauteur });
  });

  it('expression : dimensions stockées, minimum 5 mm pour rester touchable', () => {
    const e: Expression = { id: 'e', type: 'expression', x: 0, y: 0, latex: 'x', taillePt: 16, couleur: '#000000', largeurMm: 2, hauteurMm: 30 };
    expect(boiteObjet(e)).toEqual({ x: 0, y: 0, largeur: 5, hauteur: 30 });
  });

  it('objetTouche fonctionne pour les objets maths et les textes', () => {
    const o = creerOperation(10, 20, { operateur: '+', colonnes: 3, lignes: 3, virgule: null, chiffresDiviseur: 1, couleurs: true }, '#000000');
    expect(objetTouche(o, { x: 30, y: 30 }, 0)).toBe(true);
    expect(objetTouche(o, { x: 60, y: 30 }, 0)).toBe(false);
    const t: Texte = { id: 't', type: 'texte', x: 0, y: 0, largeur: 50, texte: 'a', taillePt: 14, couleur: '#000000' };
    expect(objetTouche(t, { x: 10, y: 3 }, 0)).toBe(true);
  });
});

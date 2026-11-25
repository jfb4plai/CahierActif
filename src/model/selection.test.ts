import { describe, it, expect } from 'vitest';
import { boiteDe, objetSous } from './selection';
import type { Forme, Objet, Texte, Trait } from './types';

const trait = (id: string, p: Partial<Trait> = {}): Trait => ({
  id, type: 'trait', points: [{ x: 10, y: 10 }, { x: 60, y: 10 }], couleur: '#000000', epaisseur: 0.8, ...p,
});
const texte: Texte = { id: 't', type: 'texte', x: 20, y: 5, largeur: 40, texte: 'abc', taillePt: 14, couleur: '#000000' };
const rect: Forme = { id: 'f', type: 'forme', forme: 'rectangle', x: 0, y: 40, largeur: 80, hauteur: 40, rotation: 0, couleur: '#000000', epaisseur: 0.8 };

describe('boiteDe', () => {
  it('trait : points élargis de l’épaisseur', () => {
    expect(boiteDe(trait('a', { epaisseur: 2 }))).toEqual({ x: 9, y: 9, largeur: 52, hauteur: 2 });
  });
  it('autres objets : leur boîte', () => {
    expect(boiteDe(rect)).toEqual({ x: 0, y: 40, largeur: 80, hauteur: 40 });
  });
});

describe('objetSous', () => {
  it('rien sous le doigt : undefined', () => {
    expect(objetSous([trait('a')], { x: 100, y: 100 })).toBeUndefined();
  });
  it('trait : touché à quelques mm près', () => {
    expect(objetSous([trait('a')], { x: 30, y: 11.5 })?.id).toBe('a');
    expect(objetSous([trait('a')], { x: 30, y: 20 })).toBeUndefined();
  });
  it('le dernier dessiné (dessus) gagne', () => {
    const a = trait('a');
    const b = trait('b');
    expect(objetSous([a, b], { x: 30, y: 10 })?.id).toBe('b');
  });
  it('un surligneur ne masque pas le texte dessous', () => {
    const surl = trait('s', { surligneur: true, epaisseur: 5, points: [{ x: 10, y: 8 }, { x: 70, y: 8 }] });
    const objets: Objet[] = [texte, surl];
    expect(objetSous(objets, { x: 30, y: 8 })?.id).toBe('t');
    expect(objetSous(objets, { x: 65, y: 8 })?.id).toBe('s');
  });
  it('forme : le contour, sinon l’intérieur', () => {
    expect(objetSous([rect], { x: 40, y: 40 })?.id).toBe('f'); // bord haut
    expect(objetSous([rect], { x: 40, y: 60 })?.id).toBe('f'); // intérieur
    expect(objetSous([rect], { x: 120, y: 60 })).toBeUndefined();
  });
  it('un trait à l’intérieur d’une forme est choisi avant la forme', () => {
    const t = trait('a', { points: [{ x: 20, y: 60 }, { x: 50, y: 60 }] });
    expect(objetSous([rect, t], { x: 30, y: 60 })?.id).toBe('a');
  });
});

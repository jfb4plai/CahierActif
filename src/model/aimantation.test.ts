import { describe, expect, it } from 'vitest';
import { aimanter } from './aimantation';

const A = (x: number, y: number) => ({ x, y });

describe('aimanter', () => {
  it('ne touche à rien sans fond', () => {
    const p = A(12.3, 7.7);
    expect(aimanter(p, 'aucun', 210, 297, 5)).toBe(p);
  });
  it('quadrillé 5 mm : ramène à l’intersection la plus proche', () => {
    expect(aimanter(A(12.4, 7.6), 'quadrille5', 210, 297, 2.5)).toEqual(A(10, 10));
  });
  it('quadrillé 1 cm : respecte le seuil, axe par axe', () => {
    expect(aimanter(A(21, 45), 'quadrille10', 210, 297, 2)).toEqual(A(20, 45));
  });
  it('pointé : points tous les 5 mm', () => {
    expect(aimanter(A(26, 4), 'pointe', 210, 297, 2.5)).toEqual(A(25, 5));
  });
  it('Seyes : interlignes de 2 mm, verticales de 8 mm à partir de la marge', () => {
    expect(aimanter(A(57, 13), 'seyes', 210, 297, 2)).toEqual(A(56, 14));
    expect(aimanter(A(40.5, 9), 'seyes', 210, 297, 2)).toEqual(A(40, 10));
  });
  it('Seyes : pas de verticale à gauche de la marge, donc x inchangé', () => {
    expect(aimanter(A(20, 13), 'seyes', 210, 297, 2)).toEqual(A(20, 14));
  });
  it('n’aimante pas sur le bord de la page (non dessiné) et garde la pression', () => {
    expect(aimanter({ x: 209, y: 3, p: 0.4 }, 'quadrille10', 210, 297, 8)).toEqual({ x: 209, y: 10, p: 0.4 });
  });
});

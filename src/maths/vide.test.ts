import { describe, it, expect } from 'vitest';
import { estVide } from './vide';
import { creerFraction } from './fraction';
import { creerOperation } from './operation';
import { creerRepere } from './repere';
import type { Expression } from '../model/types';

const expr = (latex: string): Expression => ({ id: 'e', type: 'expression', x: 0, y: 0, latex, taillePt: 16, couleur: '#000000', largeurMm: 0, hauteurMm: 0 });

describe('estVide', () => {
  it('fraction et expression vides', () => {
    expect(estVide(creerFraction(0, 0, '#000000'))).toBe(true);
    expect(estVide({ ...creerFraction(0, 0, '#000000'), denominateur: '4' })).toBe(false);
    expect(estVide(expr(' '))).toBe(true);
    expect(estVide(expr('x'))).toBe(false);
  });
  it('opération et repère ne sont jamais vides (posés volontairement)', () => {
    expect(estVide(creerOperation(0, 0, { operateur: '+', colonnes: 2, lignes: 3, virgule: null, chiffresDiviseur: 1, couleurs: true }, '#000000'))).toBe(false);
    expect(estVide(creerRepere(0, 0, { xmin: -1, xmax: 1, ymin: -1, ymax: 1, uniteMm: 10 }, '#000000'))).toBe(false);
  });
});

import { describe, it, expect } from 'vitest';
import { outilsPour, OUTILS, OUTIL_TYPE } from './outils';

describe('outils', () => {
  it('P1-P2 : pas de gomme fine, de déplacement, de fraction, d’expression ni de repère', () => {
    expect(outilsPour('p1p2').map(o => o.id)).toEqual(['main', 'stylo', 'gomme-objet', 'texte', 'operation']);
  });
  it('P3-P6 : opérations et fractions, pas d’expression ni de repère', () => {
    const ids = outilsPour('p3p6').map(o => o.id);
    expect(ids).toContain('fraction');
    expect(ids).not.toContain('expression');
    expect(ids).not.toContain('repere');
  });
  it('secondaire : tous les outils', () => {
    expect(outilsPour('secondaire')).toHaveLength(OUTILS.length);
  });
  it('chaque outil a un libellé et une aide', () => {
    for (const o of OUTILS) {
      expect(o.libelle.length).toBeGreaterThan(0);
      expect(o.aide.length).toBeGreaterThan(0);
    }
  });
  it('OUTIL_TYPE relie les outils de création à leur type d’objet', () => {
    expect(OUTIL_TYPE).toEqual({ texte: 'texte', operation: 'operation', fraction: 'fraction', expression: 'expression', repere: 'repere' });
  });
});

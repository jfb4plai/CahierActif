import { describe, it, expect } from 'vitest';
import { outilsPour, OUTILS } from './outils';

describe('outils', () => {
  it('P1-P2 : pas de gomme partielle ni de déplacement', () => {
    expect(outilsPour('p1p2').map(o => o.id)).toEqual(['main', 'stylo', 'gomme-objet', 'texte']);
  });
  it('P3-P6 et secondaire : tous les outils du socle', () => {
    expect(outilsPour('p3p6')).toHaveLength(OUTILS.length);
    expect(outilsPour('secondaire')).toHaveLength(OUTILS.length);
  });
  it('chaque outil a un libellé et une aide', () => {
    for (const o of OUTILS) {
      expect(o.libelle.length).toBeGreaterThan(0);
      expect(o.aide.length).toBeGreaterThan(0);
    }
  });
});

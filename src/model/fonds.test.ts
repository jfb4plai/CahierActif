import { describe, it, expect } from 'vitest';
import { motifFond, FONDS } from './fonds';

describe('fonds', () => {
  it('aucun : rien', () => {
    expect(motifFond('aucun', 210, 297)).toEqual({ lignes: [], ronds: [] });
  });

  it('quadrillé 5 mm sur A4 : 41 verticales + 59 horizontales', () => {
    const m = motifFond('quadrille5', 210, 297);
    expect(m.lignes.filter(l => l.x1 === l.x2)).toHaveLength(41);
    expect(m.lignes.filter(l => l.y1 === l.y2)).toHaveLength(59);
  });

  it('quadrillé 1 cm sur A4 : 20 + 29', () => {
    expect(motifFond('quadrille10', 210, 297).lignes).toHaveLength(49);
  });

  it('Seyes : 148 horizontales dont 37 appuyées, marge rouge à 40 mm, 21 verticales', () => {
    const m = motifFond('seyes', 210, 297);
    const h = m.lignes.filter(l => l.y1 === l.y2);
    expect(h).toHaveLength(148);
    expect(h.filter(l => l.epaisseur === 0.25)).toHaveLength(37);
    const marge = m.lignes.filter(l => l.couleur === '#e05a5a');
    expect(marge).toHaveLength(1);
    expect(marge[0].x1).toBe(40);
    expect(m.lignes.filter(l => l.x1 === l.x2 && l.couleur !== '#e05a5a')).toHaveLength(21);
  });

  it('pointé 5 mm sur A4 : 41 × 59 points', () => {
    expect(motifFond('pointe', 210, 297).ronds).toHaveLength(41 * 59);
  });

  it('FONDS liste les choix avec libellé', () => {
    expect(FONDS.map(f => f.id)).toEqual(['aucun', 'quadrille5', 'quadrille10', 'seyes', 'pointe']);
  });
});

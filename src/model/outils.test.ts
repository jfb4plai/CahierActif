import { describe, it, expect } from 'vitest';
import { groupesPour, outilsPour, OUTILS, OUTIL_TYPE } from './outils';

describe('outils', () => {
  it('P1-P2 : pas de sélection, de surligneur, de formes, de droite, de gomme fine, de déplacement, de fraction, d’expression ni de repère', () => {
    expect(outilsPour('p1p2').map(o => o.id)).toEqual(['main', 'stylo', 'gomme-objet', 'texte', 'operation']);
  });
  it('P3-P6 : opérations et fractions, pas d’expression ni de repère', () => {
    const ids = outilsPour('p3p6').map(o => o.id);
    expect(ids).toContain('fraction');
    expect(ids).toContain('selectionner');
    expect(ids).toContain('surligneur');
    expect(ids).toContain('formes');
    expect(ids).toContain('droite');
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
  it('colonne : outils regroupés dans l’ordre, sans groupe vide, aucun outil oublié', () => {
    const g = groupesPour('p3p6');
    expect(g.map(x => x.id)).toEqual(['choisir', 'ecrire', 'corriger', 'dessiner', 'maths']);
    expect(g.flatMap(x => x.outils.map(o => o.id)).sort()).toEqual(outilsPour('p3p6').map(o => o.id).sort());
    expect(g[0].outils.map(o => o.id)).toEqual(['main', 'selectionner']);
  });
  it('P1-P2 : pas de groupe Dessiner', () => {
    expect(groupesPour('p1p2').map(x => x.id)).not.toContain('dessiner');
  });
});

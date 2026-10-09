import { describe, it, expect } from 'vitest';
import type { CahierDoc, Trait, Texte } from './types';
import {
  nouveauDocVierge, nouveauDocPdf, ajouterObjet, modifierObjet, supprimerObjet,
  remplacerObjet, changerFond, ajouterPageVierge,
} from './ops';

const trait = (id: string): Trait => ({
  id, type: 'trait', points: [{ x: 0, y: 0 }, { x: 10, y: 10 }], couleur: '#000000', epaisseur: 0.8,
});

describe('ops', () => {
  it('nouveauDocVierge crée une page A4 sans fond', () => {
    const d = nouveauDocVierge('Essai', 'p3p6');
    expect(d.pages).toHaveLength(1);
    expect(d.pages[0]).toEqual({ largeurMm: 210, hauteurMm: 297, fond: 'aucun', objets: [] });
    expect(d.source).toEqual({ type: 'vierge' });
    expect(d.niveau).toBe('p3p6');
  });

  it('nouveauDocPdf crée une page par taille', () => {
    const data = new ArrayBuffer(4);
    const d = nouveauDocPdf('Fiche', 'secondaire', data, [
      { largeurMm: 210, hauteurMm: 297 }, { largeurMm: 297, hauteurMm: 210 },
    ]);
    expect(d.pages.map(p => p.largeurMm)).toEqual([210, 297]);
    expect(d.source).toEqual({ type: 'pdf', data });
  });

  it('ajouterObjet ne modifie pas le document d’origine', () => {
    const d0 = nouveauDocVierge('E', 'p3p6');
    const d1 = ajouterObjet(d0, 0, trait('a'));
    expect(d0.pages[0].objets).toHaveLength(0);
    expect(d1.pages[0].objets).toHaveLength(1);
    expect(d1.modifie).toBeGreaterThanOrEqual(d0.modifie);
  });

  it('modifierObjet fusionne le patch sur le bon objet', () => {
    let d = nouveauDocVierge('E', 'p3p6');
    const t: Texte = { id: 't', type: 'texte', x: 1, y: 2, largeur: 80, texte: 'a', taillePt: 14, couleur: '#000000' };
    d = ajouterObjet(d, 0, t);
    d = modifierObjet(d, 0, 't', { texte: 'b' });
    expect((d.pages[0].objets[0] as Texte).texte).toBe('b');
    expect((d.pages[0].objets[0] as Texte).x).toBe(1);
  });

  it('supprimerObjet retire l’objet', () => {
    let d = ajouterObjet(nouveauDocVierge('E', 'p3p6'), 0, trait('a'));
    d = supprimerObjet(d, 0, 'a');
    expect(d.pages[0].objets).toHaveLength(0);
  });

  it('remplacerObjet remplace en place par 0..n objets', () => {
    let d = nouveauDocVierge('E', 'p3p6');
    d = ajouterObjet(d, 0, trait('a'));
    d = ajouterObjet(d, 0, trait('b'));
    d = remplacerObjet(d, 0, 'a', [trait('a1'), trait('a2')]);
    expect(d.pages[0].objets.map(o => o.id)).toEqual(['a1', 'a2', 'b']);
  });

  it('changerFond et ajouterPageVierge', () => {
    let d = changerFond(nouveauDocVierge('E', 'p3p6'), 0, 'seyes');
    d = ajouterPageVierge(d);
    expect(d.pages.map(p => p.fond)).toEqual(['seyes', 'aucun']);
  });

  it('page inexistante → RangeError', () => {
    const d: CahierDoc = nouveauDocVierge('E', 'p3p6');
    expect(() => ajouterObjet(d, 3, trait('a'))).toThrow(RangeError);
  });
});

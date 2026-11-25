import { describe, it, expect } from 'vitest';
import type { CahierDoc, Trait, Texte } from './types';
import {
  nouveauDocVierge, nouveauDocPdf, ajouterObjet, modifierObjet, supprimerObjet, deplacerObjet, deplacerObjets, supprimerObjets, membresDuGroupe, grouperObjets, degrouperObjets, recolorerObjets, epaissirObjets,
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

  it('deplacerObjet : un trait décale tous ses points, un texte son coin, les autres objets sont intacts', () => {
    let d = nouveauDocVierge('E', 'p3p6');
    d = ajouterObjet(d, 0, trait('a'));
    d = ajouterObjet(d, 0, trait('b'));
    d = deplacerObjet(d, 0, 'a', 5, -2);
    const a = d.pages[0].objets[0] as Trait;
    const b = d.pages[0].objets[1] as Trait;
    expect(a.points.map(q => [q.x, q.y])).toEqual(trait('a').points.map(q => [q.x + 5, q.y - 2]));
    expect(b).toEqual(trait('b'));
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

describe('groupes', () => {
  const texte = (id: string): Texte => ({ id, type: 'texte', x: 10, y: 10, largeur: 30, texte: 'a', taillePt: 14, couleur: '#000000' });
  const base = () => {
    let d = nouveauDocVierge('G', 'p3p6');
    d = ajouterObjet(d, 0, trait('a'));
    d = ajouterObjet(d, 0, trait('b'));
    d = ajouterObjet(d, 0, texte('t'));
    return d;
  };

  it('grouper : au moins 2 objets, même identifiant de groupe', () => {
    const d = grouperObjets(base(), 0, ['a', 't']);
    const [a, b, t] = d.pages[0].objets;
    expect(a.groupe).toBeDefined();
    expect(a.groupe).toBe(t.groupe);
    expect(b.groupe).toBeUndefined();
  });
  it('grouper un seul objet : document inchangé', () => {
    const d = base();
    expect(grouperObjets(d, 0, ['a'])).toBe(d);
  });
  it('membresDuGroupe : tout le groupe, ou l’objet seul', () => {
    const d = grouperObjets(base(), 0, ['a', 't']);
    expect(membresDuGroupe(d.pages[0].objets, 'a').sort()).toEqual(['a', 't']);
    expect(membresDuGroupe(d.pages[0].objets, 'b')).toEqual(['b']);
  });
  it('regrouper des objets déjà groupés : un seul nouveau groupe', () => {
    let d = grouperObjets(base(), 0, ['a', 'b']);
    d = grouperObjets(d, 0, ['a', 'b', 't']);
    const g = new Set(d.pages[0].objets.map(o => o.groupe));
    expect(g.size).toBe(1);
  });
  it('dégrouper : le champ disparaît, les objets restent', () => {
    let d = grouperObjets(base(), 0, ['a', 't']);
    d = degrouperObjets(d, 0, ['a', 't']);
    expect(d.pages[0].objets).toHaveLength(3);
    expect(d.pages[0].objets.every(o => !('groupe' in o))).toBe(true);
  });
  it('déplacer et supprimer plusieurs objets', () => {
    let d = deplacerObjets(base(), 0, ['a', 't'], 5, 5);
    expect((d.pages[0].objets[2] as Texte).x).toBe(15);
    expect((d.pages[0].objets[0] as Trait).points[0]).toMatchObject({ x: 5, y: 5 });
    expect((d.pages[0].objets[1] as Trait).points[0]).toMatchObject({ x: 0, y: 0 });
    d = supprimerObjets(d, 0, ['a', 't']);
    expect(d.pages[0].objets.map(o => o.id)).toEqual(['b']);
  });
  it('recolorer : l’encre ne touche pas le surligneur, et inversement', () => {
    let d = nouveauDocVierge('C', 'p3p6');
    d = ajouterObjet(d, 0, trait('a'));
    d = ajouterObjet(d, 0, { ...trait('s'), surligneur: true });
    const encre = recolorerObjets(d, 0, ['a', 's'], '#dc2626');
    expect(encre.pages[0].objets.map(o => (o as Trait).couleur)).toEqual(['#dc2626', trait('s').couleur]);
    const surl = recolorerObjets(d, 0, ['a', 's'], '#4ade80', true);
    expect(surl.pages[0].objets.map(o => (o as Trait).couleur)).toEqual([trait('a').couleur, '#4ade80']);
  });
  it('épaisseur : traits, formes et droites seulement', () => {
    let d = nouveauDocVierge('E', 'p3p6');
    d = ajouterObjet(d, 0, trait('a'));
    d = ajouterObjet(d, 0, texte('t'));
    d = epaissirObjets(d, 0, ['a', 't'], 1.6);
    expect((d.pages[0].objets[0] as Trait).epaisseur).toBe(1.6);
    expect('epaisseur' in d.pages[0].objets[1]).toBe(false);
  });
});
});

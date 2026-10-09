import { A4, nouvelId } from './types';
import type { CahierDoc, Fond, Niveau, Objet, Page, TaillePage } from './types';

function pageVide(t: TaillePage): Page {
  return { largeurMm: t.largeurMm, hauteurMm: t.hauteurMm, fond: 'aucun', objets: [] };
}

export function nouveauDocVierge(titre: string, niveau: Niveau): CahierDoc {
  const now = Date.now();
  return { id: nouvelId(), titre, niveau, cree: now, modifie: now, source: { type: 'vierge' }, pages: [pageVide(A4)] };
}

export function nouveauDocPdf(titre: string, niveau: Niveau, data: ArrayBuffer, tailles: TaillePage[]): CahierDoc {
  const now = Date.now();
  return { id: nouvelId(), titre, niveau, cree: now, modifie: now, source: { type: 'pdf', data }, pages: tailles.map(pageVide) };
}

function majPage(doc: CahierDoc, i: number, f: (p: Page) => Page): CahierDoc {
  if (i < 0 || i >= doc.pages.length) throw new RangeError(`page ${i} inexistante`);
  const pages = doc.pages.slice();
  pages[i] = f(pages[i]);
  return { ...doc, pages, modifie: Date.now() };
}

export function ajouterObjet(doc: CahierDoc, i: number, o: Objet): CahierDoc {
  return majPage(doc, i, p => ({ ...p, objets: [...p.objets, o] }));
}

export function modifierObjet(doc: CahierDoc, i: number, id: string, patch: Partial<Objet>): CahierDoc {
  return majPage(doc, i, p => ({
    ...p,
    objets: p.objets.map(o => (o.id === id ? ({ ...o, ...patch } as Objet) : o)),
  }));
}

export function supprimerObjet(doc: CahierDoc, i: number, id: string): CahierDoc {
  return majPage(doc, i, p => ({ ...p, objets: p.objets.filter(o => o.id !== id) }));
}

export function remplacerObjet(doc: CahierDoc, i: number, id: string, nouveaux: Objet[]): CahierDoc {
  return majPage(doc, i, p => ({ ...p, objets: p.objets.flatMap(o => (o.id === id ? nouveaux : [o])) }));
}

export function changerFond(doc: CahierDoc, i: number, fond: Fond): CahierDoc {
  return majPage(doc, i, p => ({ ...p, fond }));
}

export function ajouterPageVierge(doc: CahierDoc): CahierDoc {
  return { ...doc, pages: [...doc.pages, pageVide(A4)], modifie: Date.now() };
}

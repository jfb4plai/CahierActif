import { A4, nouvelId } from './types';
import type { CahierDoc, Fond, ImageSource, Niveau, Objet, Page, TaillePage } from './types';

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

/** Document à partir de photos de feuilles : une page par photo, à la forme de la photo. */
export function nouveauDocPhotos(titre: string, niveau: Niveau, images: ImageSource[], tailles: TaillePage[]): CahierDoc {
  if (images.length === 0 || images.length !== tailles.length) throw new RangeError('une taille de page par photo');
  const now = Date.now();
  return { id: nouvelId(), titre, niveau, cree: now, modifie: now, source: { type: 'photos', images }, pages: tailles.map(pageVide) };
}

/** Ajoute des pages-photos à la fin d'un document de photos. */
export function ajouterPagesPhotos(doc: CahierDoc, images: ImageSource[], tailles: TaillePage[]): CahierDoc {
  if (doc.source.type !== 'photos') throw new RangeError('ce document ne vient pas de photos');
  if (images.length !== tailles.length) throw new RangeError('une taille de page par photo');
  const debut = doc.source.images.length;
  return {
    ...doc,
    source: { type: 'photos', images: [...doc.source.images, ...images] },
    pages: [...doc.pages, ...tailles.map((t, k) => ({ ...pageVide(t), origine: debut + k }))],
    modifie: Date.now(),
  };
}

/** Rang de la page `i` dans la source (PDF ou photos). */
export function origineDe(doc: CahierDoc, i: number): number {
  return doc.pages[i].origine ?? i;
}

/** Déplace la page `i` d'un cran (delta = -1 vers le début, +1 vers la fin) ; au bord : document inchangé. */
export function deplacerPage(doc: CahierDoc, i: number, delta: -1 | 1): CahierDoc {
  const j = i + delta;
  if (i < 0 || i >= doc.pages.length || j < 0 || j >= doc.pages.length) return doc;
  // Chaque page note d'où vient son fond avant que l'ordre change.
  const pages = doc.pages.map((p, k) => (p.origine === undefined ? { ...p, origine: k } : p));
  [pages[i], pages[j]] = [pages[j], pages[i]];
  return { ...doc, pages, modifie: Date.now() };
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

/** Déplace n'importe quel objet de (dx, dy) mm : un trait décale tous ses points, les autres leur coin. */
export function deplacerObjet(doc: CahierDoc, i: number, id: string, dx: number, dy: number): CahierDoc {
  return majPage(doc, i, p => ({
    ...p,
    objets: p.objets.map(o => {
      if (o.id !== id) return o;
      if (o.type === 'trait') return { ...o, points: o.points.map(q => ({ ...q, x: q.x + dx, y: q.y + dy })) };
      if (o.type === 'droite') return { ...o, a: { x: o.a.x + dx, y: o.a.y + dy }, b: { x: o.b.x + dx, y: o.b.y + dy } };
      return { ...o, x: o.x + dx, y: o.y + dy };
    }),
  }));
}

/** Comme deplacerObjet, pour plusieurs objets d'un coup (un seul « annuler »). */
export function deplacerObjets(doc: CahierDoc, i: number, ids: string[], dx: number, dy: number): CahierDoc {
  return ids.reduce((d, id) => deplacerObjet(d, i, id, dx, dy), doc);
}

export function supprimerObjets(doc: CahierDoc, i: number, ids: string[]): CahierDoc {
  const s = new Set(ids);
  return majPage(doc, i, p => ({ ...p, objets: p.objets.filter(o => !s.has(o.id)) }));
}

/** Identifiants de tous les objets du groupe de `id` (ou de `id` seul s'il n'est dans aucun groupe). */
export function membresDuGroupe(objets: Objet[], id: string): string[] {
  const g = objets.find(o => o.id === id)?.groupe;
  return g ? objets.filter(o => o.groupe === g).map(o => o.id) : [id];
}

/** Réunit les objets (au moins 2) dans un nouveau groupe ; ceux qui étaient dans un autre groupe le quittent. */
export function grouperObjets(doc: CahierDoc, i: number, ids: string[]): CahierDoc {
  if (new Set(ids).size < 2) return doc;
  const g = nouvelId();
  const s = new Set(ids);
  return majPage(doc, i, p => ({ ...p, objets: p.objets.map(o => (s.has(o.id) ? { ...o, groupe: g } : o)) }));
}

/** Sort les objets de leur groupe (ils restent là où ils sont). */
export function degrouperObjets(doc: CahierDoc, i: number, ids: string[]): CahierDoc {
  const s = new Set(ids);
  return majPage(doc, i, p => ({
    ...p,
    objets: p.objets.map(o => {
      if (!s.has(o.id) || o.groupe === undefined) return o;
      const { groupe: _g, ...reste } = o;
      return reste as Objet;
    }),
  }));
}

/** Couleur appliquée à des objets ; un surligneur n'est recoloré que par `surligneur: true` (sa propre palette). */
export function recolorerObjets(doc: CahierDoc, i: number, ids: string[], couleur: string, surligneur = false): CahierDoc {
  const s = new Set(ids);
  return majPage(doc, i, p => ({
    ...p,
    objets: p.objets.map(o => (s.has(o.id) && (o.type === 'trait' && !!o.surligneur) === surligneur ? ({ ...o, couleur } as Objet) : o)),
  }));
}

/**
 * Épaisseur appliquée aux traits d'encre, formes et droites choisis ; le texte et les objets de maths n'en ont pas.
 * Avec `surligneur: true` : seulement les traits de surligneur (qui ont leur propre curseur).
 */
export function epaissirObjets(doc: CahierDoc, i: number, ids: string[], epaisseur: number, surligneur = false): CahierDoc {
  const s = new Set(ids);
  return majPage(doc, i, p => ({
    ...p,
    objets: p.objets.map(o => {
      if (!s.has(o.id)) return o;
      if (surligneur) return o.type === 'trait' && o.surligneur ? { ...o, epaisseur } : o;
      if (o.type === 'forme' || o.type === 'droite' || (o.type === 'trait' && !o.surligneur)) return { ...o, epaisseur };
      return o;
    }),
  }));
}

/** Taille (points) appliquée aux textes choisis ; les autres objets sont ignorés. */
export function redimensionnerTextes(doc: CahierDoc, i: number, ids: string[], taillePt: number): CahierDoc {
  const s = new Set(ids);
  return majPage(doc, i, p => ({ ...p, objets: p.objets.map(o => (s.has(o.id) && o.type === 'texte' ? { ...o, taillePt } : o)) }));
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

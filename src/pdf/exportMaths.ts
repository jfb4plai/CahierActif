import type { PDFDocument, PDFFont, PDFPage } from 'pdf-lib';
import { rgb } from 'pdf-lib';
import { couleurColonne, geometrieOperation, valeurCellule } from '../maths/operation';
import { geometrieFraction } from '../maths/fraction';
import { MARGE_MM, etiquettePoint, formatNombre, geometrieRepere, versMm } from '../maths/repere';
import { hexVersRgb01 } from '../lib/couleurs';
import type { Expression, Fraction, OperationPosee, Repere } from '../model/types';
import { K, X, Y, couleur, encodable, type Origine } from './origine';

export type RendreExpression = (o: Expression) => Promise<Uint8Array>;

const GRILLE = rgb(0.61, 0.76, 0.87);

function texteCentre(p: PDFPage, font: PDFFont, s: string, cx: number, cy: number, taille: number, hex: string) {
  const t = encodable(font, s);
  const l = font.widthOfTextAtSize(t, taille);
  p.drawText(t, { x: cx - l / 2, y: cy - taille * 0.35, size: taille, font, color: couleur(hex) });
}

function ligne(p: PDFPage, r: Origine, x1: number, y1: number, x2: number, y2: number, epMm: number, c = GRILLE) {
  p.drawLine({ start: { x: X(r, x1), y: Y(r, y1) }, end: { x: X(r, x2), y: Y(r, y2) }, thickness: epMm * K, color: c });
}

export function dessinerOperation(p: PDFPage, r: Origine, o: OperationPosee, font: PDFFont) {
  const g = geometrieOperation(o);
  for (const c of g.cellules) {
    const x = o.x + c.x;
    const y = o.y + c.y;
    const fond = c.zone === 'case' ? couleurColonne(o, (c.index % o.colonnes)) : null;
    if (fond) {
      const f = hexVersRgb01(fond);
      p.drawRectangle({ x: X(r, x), y: Y(r, y + c.h), width: c.l * K, height: c.h * K, color: rgb(f.r, f.g, f.b) });
    }
    p.drawRectangle({ x: X(r, x), y: Y(r, y + c.h), width: c.l * K, height: c.h * K, borderColor: GRILLE, borderWidth: 0.2 * K });
    const v = valeurCellule(o, c.zone, c.index);
    if (v) texteCentre(p, font, v, X(r, x + c.l / 2), Y(r, y + c.h / 2), c.zone === 'retenue' ? 11 : 20, o.couleur);
  }
  const trait = couleur(o.couleur);
  for (const b of g.barres) ligne(p, r, o.x + b.x1, o.y + b.y1, o.x + b.x2, o.y + b.y2, 0.5, trait);
  if (g.signe) texteCentre(p, font, o.operateur === '-' ? '-' : o.operateur === '×' ? '×' : '+', X(r, o.x + g.signe.x), Y(r, o.y + g.signe.y), 20, o.couleur);
  if (g.virgule) ligne(p, r, o.x + g.virgule.x, o.y + g.virgule.y1, o.x + g.virgule.x, o.y + g.virgule.y2, 0.6, rgb(0.86, 0.15, 0.15));
}

export function dessinerFraction(p: PDFPage, r: Origine, f: Fraction, font: PDFFont) {
  const g = geometrieFraction(f);
  const cx = X(r, f.x + g.largeur / 2);
  texteCentre(p, font, f.numerateur, cx, Y(r, f.y + g.numerateur.y + g.numerateur.h / 2), f.taillePt, f.couleur);
  ligne(p, r, f.x + 0.5, f.y + g.barreY, f.x + g.largeur - 0.5, f.y + g.barreY, 0.4, couleur(f.couleur));
  texteCentre(p, font, f.denominateur, cx, Y(r, f.y + g.denominateur.y + g.denominateur.h / 2), f.taillePt, f.couleur);
}

export function dessinerRepere(p: PDFPage, r: Origine, o: Repere, font: PDFFont) {
  const g = geometrieRepere(o);
  const gauche = o.x + MARGE_MM;
  const droite = o.x + g.largeur - MARGE_MM;
  const haut = o.y + MARGE_MM;
  const bas = o.y + g.hauteur - MARGE_MM;
  const fin = rgb(0.9, 0.91, 0.92);
  for (const t of g.graduationsX) ligne(p, r, t.position, haut, t.position, bas, 0.15, fin);
  for (const t of g.graduationsY) ligne(p, r, gauche, t.position, droite, t.position, 0.15, fin);
  const c = couleur(o.couleur);
  ligne(p, r, gauche, g.origine.y, droite, g.origine.y, 0.4, c);
  ligne(p, r, g.origine.x, haut, g.origine.x, bas, 0.4, c);
  for (const t of g.graduationsX) {
    ligne(p, r, t.position, g.origine.y - 1, t.position, g.origine.y + 1, 0.3, c);
    if (t.valeur !== 0) texteCentre(p, font, formatNombre(t.valeur), X(r, t.position), Y(r, g.origine.y + 3), 8, o.couleur);
  }
  for (const t of g.graduationsY) {
    ligne(p, r, g.origine.x - 1, t.position, g.origine.x + 1, t.position, 0.3, c);
    if (t.valeur !== 0) texteCentre(p, font, formatNombre(t.valeur), X(r, g.origine.x - 3), Y(r, t.position), 8, o.couleur);
  }
  texteCentre(p, font, '0', X(r, g.origine.x - 2.5), Y(r, g.origine.y + 3), 8, o.couleur);
  for (const pt of o.points) {
    const m = versMm(o, pt.x, pt.y);
    ligne(p, r, m.x - 1.2, m.y - 1.2, m.x + 1.2, m.y + 1.2, 0.35, c);
    ligne(p, r, m.x - 1.2, m.y + 1.2, m.x + 1.2, m.y - 1.2, 0.35, c);
    const s = encodable(font, etiquettePoint(pt));
    p.drawText(s, { x: X(r, m.x + 1.5), y: Y(r, m.y - 1.5), size: 9, font, color: c });
  }
}

export async function dessinerExpression(p: PDFPage, r: Origine, o: Expression, font: PDFFont, out: PDFDocument, rendre?: RendreExpression) {
  if (rendre) {
    try {
      const png = await out.embedPng(await rendre(o));
      p.drawImage(png, { x: X(r, o.x), y: Y(r, o.y + o.hauteurMm), width: o.largeurMm * K, height: o.hauteurMm * K });
      return;
    } catch {
      // repli : le LaTeX reste lisible par l'enseignant
    }
  }
  p.drawText(encodable(font, o.latex), { x: X(r, o.x), y: Y(r, o.y) - o.taillePt, size: o.taillePt * 0.8, font, color: couleur(o.couleur) });
}

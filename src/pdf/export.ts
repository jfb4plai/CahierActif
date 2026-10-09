import { LineCapStyle, PDFDocument, PDFFont, PDFPage, StandardFonts } from 'pdf-lib';
import { motifFond } from '../model/fonds';
import type { CahierDoc, Objet, Page } from '../model/types';
import { K, X, Y, couleur, encodable, origine } from './origine';
import { dessinerExpression, dessinerFraction, dessinerOperation, dessinerRepere, type RendreExpression } from './exportMaths';

export type OptionsExport = { rendreExpression?: RendreExpression };

function dessinerFond(p: PDFPage, page: Page) {
  const r0 = origine(p);
  const m = motifFond(page.fond, page.largeurMm, page.hauteurMm);
  for (const l of m.lignes) {
    p.drawLine({ start: { x: X(r0, l.x1), y: Y(r0, l.y1) }, end: { x: X(r0, l.x2), y: Y(r0, l.y2) }, thickness: l.epaisseur * K, color: couleur(l.couleur) });
  }
  for (const r of m.ronds) p.drawCircle({ x: X(r0, r.x), y: Y(r0, r.y), size: r.r * K, color: couleur(r.couleur) });
}

function dessinerObjet(p: PDFPage, o: Objet, font: PDFFont) {
  const r0 = origine(p);
  if (o.type === 'trait') {
    if (o.points.length === 1) {
      p.drawCircle({ x: X(r0, o.points[0].x), y: Y(r0, o.points[0].y), size: (o.epaisseur / 2) * K, color: couleur(o.couleur) });
      return;
    }
    // drawSvgPath : origine au coin haut-gauche de la CropBox, axe y vers le bas comme dans le modèle.
    const chemin = o.points.map((q, i) => `${i === 0 ? 'M' : 'L'} ${(q.x * K).toFixed(2)} ${(q.y * K).toFixed(2)}`).join(' ');
    p.drawSvgPath(chemin, { x: r0.x0, y: r0.haut, borderColor: couleur(o.couleur), borderWidth: o.epaisseur * K, borderLineCap: LineCapStyle.Round });
    return;
  }
  if (o.type === 'operation') return dessinerOperation(p, r0, o, font);
  if (o.type === 'fraction') return dessinerFraction(p, r0, o, font);
  if (o.type === 'repere') return dessinerRepere(p, r0, o, font);
  if (o.type === 'expression') return; // asynchrone : traité dans exporterPdf
  if (!o.texte.trim()) return;
  // Ligne de base approximative : haut du cadre + demi-interligne + jambage supérieur.
  p.drawText(encodable(font, o.texte), {
    x: X(r0, o.x),
    y: Y(r0, o.y) - o.taillePt * 1.05,
    size: o.taillePt,
    font,
    lineHeight: o.taillePt * 1.5,
    maxWidth: o.largeur * K,
    color: couleur(o.couleur),
  });
}

// Source PDF : copie des octets (le document en mémoire reste intact). Sinon : pages créées, photo en fond.
async function preparer(doc: CahierDoc): Promise<PDFDocument> {
  if (doc.source.type === 'pdf') return PDFDocument.load(doc.source.data.slice(0));
  const out = await PDFDocument.create();
  for (let i = 0; i < doc.pages.length; i++) {
    const page = doc.pages[i];
    const p = out.addPage([page.largeurMm * K, page.hauteurMm * K]);
    const img = doc.source.type === 'photos' ? doc.source.images[i] : undefined;
    if (img) {
      const emb = img.mime === 'image/png' ? await out.embedPng(img.data) : await out.embedJpg(img.data);
      p.drawImage(emb, { x: 0, y: 0, width: p.getWidth(), height: p.getHeight() });
    }
  }
  return out;
}

export async function exporterPdf(doc: CahierDoc, options: OptionsExport = {}): Promise<Uint8Array> {
  const out = await preparer(doc);
  out.setTitle(doc.titre);
  out.setCreator('CahierActif (PLAI)');
  const font = await out.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < doc.pages.length; i++) {
    const page = doc.pages[i];
    const p = out.getPage(i);
    dessinerFond(p, page);
    for (const o of page.objets) {
      if (o.type === 'expression') await dessinerExpression(p, origine(p), o, font, out, options.rendreExpression);
      else dessinerObjet(p, o, font);
    }
  }
  return out.save();
}

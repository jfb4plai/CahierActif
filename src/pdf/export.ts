import { LineCapStyle, PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import { hexVersRgb01 } from '../lib/couleurs';
import { mmVersPt } from '../lib/units';
import { motifFond } from '../model/fonds';
import type { CahierDoc, Objet, Page } from '../model/types';

const K = mmVersPt(1); // pt par mm

const couleur = (hex: string) => {
  const c = hexVersRgb01(hex);
  return rgb(c.r, c.g, c.b);
};

/** Helvetica ne couvre que WinAnsi : tout caractère non encodable devient « ? ». */
function encodable(font: PDFFont, texte: string): string {
  return Array.from(texte)
    .map(ch => {
      if (ch === '\n') return ch;
      try {
        font.encodeText(ch);
        return ch;
      } catch {
        return '?';
      }
    })
    .join('');
}

function dessinerFond(p: PDFPage, page: Page) {
  const H = p.getHeight();
  const m = motifFond(page.fond, page.largeurMm, page.hauteurMm);
  for (const l of m.lignes) {
    p.drawLine({ start: { x: l.x1 * K, y: H - l.y1 * K }, end: { x: l.x2 * K, y: H - l.y2 * K }, thickness: l.epaisseur * K, color: couleur(l.couleur) });
  }
  for (const r of m.ronds) p.drawCircle({ x: r.x * K, y: H - r.y * K, size: r.r * K, color: couleur(r.couleur) });
}

function dessinerObjet(p: PDFPage, o: Objet, font: PDFFont) {
  const H = p.getHeight();
  if (o.type === 'trait') {
    if (o.points.length === 1) {
      p.drawCircle({ x: o.points[0].x * K, y: H - o.points[0].y * K, size: (o.epaisseur / 2) * K, color: couleur(o.couleur) });
      return;
    }
    // drawSvgPath : origine en (0, H), axe y vers le bas comme dans le modèle.
    const chemin = o.points.map((q, i) => `${i === 0 ? 'M' : 'L'} ${(q.x * K).toFixed(2)} ${(q.y * K).toFixed(2)}`).join(' ');
    p.drawSvgPath(chemin, { x: 0, y: H, borderColor: couleur(o.couleur), borderWidth: o.epaisseur * K, borderLineCap: LineCapStyle.Round });
    return;
  }
  if (!o.texte.trim()) return;
  // Ligne de base approximative : haut du cadre + demi-interligne + jambage supérieur.
  p.drawText(encodable(font, o.texte), {
    x: o.x * K,
    y: H - o.y * K - o.taillePt * 1.05,
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

export async function exporterPdf(doc: CahierDoc): Promise<Uint8Array> {
  const out = await preparer(doc);
  out.setTitle(doc.titre);
  out.setCreator('CahierActif (PLAI)');
  const font = await out.embedFont(StandardFonts.Helvetica);
  doc.pages.forEach((page, i) => {
    const p = out.getPage(i);
    dessinerFond(p, page);
    for (const o of page.objets) dessinerObjet(p, o, font);
  });
  return out.save();
}

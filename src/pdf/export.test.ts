import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { exporterPdf } from './export';
import { ajouterObjet, ajouterPageVierge, changerFond, nouveauDocPdf, nouveauDocVierge } from '../model/ops';

async function texteDe(octets: Uint8Array, page: number): Promise<string> {
  const d = await pdfjs.getDocument({ data: octets.slice() }).promise;
  const c = await (await d.getPage(page)).getTextContent();
  return c.items.map(i => ('str' in i ? i.str : '')).join(' ');
}

async function source(): Promise<ArrayBuffer> {
  const d = await PDFDocument.create();
  d.addPage([595.28, 841.89]);
  const o = await d.save();
  return o.buffer.slice(o.byteOffset, o.byteOffset + o.byteLength) as ArrayBuffer;
}

describe('exporterPdf', () => {
  it('PDF source : garde le nombre de pages et écrit le texte de l’élève', async () => {
    let d = nouveauDocPdf('Fiche', 'p3p6', await source(), [{ largeurMm: 210, hauteurMm: 297 }]);
    d = ajouterObjet(d, 0, { id: 't', type: 'texte', x: 20, y: 30, largeur: 100, texte: 'Réponse élève ≤ 3', taillePt: 14, couleur: '#000000' });
    d = ajouterObjet(d, 0, { id: 's', type: 'trait', points: [{ x: 10, y: 10 }, { x: 50, y: 60 }], couleur: '#dc2626', epaisseur: 0.8 });
    const out = await exporterPdf(d);
    expect((await PDFDocument.load(out)).getPageCount()).toBe(1);
    expect(await texteDe(out, 1)).toContain('Réponse élève ? 3');
  });

  it('ne modifie pas les octets source du document', async () => {
    const src = await source();
    const avant = new Uint8Array(src).slice();
    await exporterPdf(nouveauDocPdf('F', 'p3p6', src, [{ largeurMm: 210, hauteurMm: 297 }]));
    expect(new Uint8Array(src)).toEqual(avant);
  });

  it('document vierge : une page A4 par page, fonds dessinés sans erreur', async () => {
    let d = ajouterPageVierge(nouveauDocVierge('V', 'p1p2'));
    d = changerFond(d, 0, 'seyes');
    d = changerFond(d, 1, 'pointe');
    d = ajouterObjet(d, 1, { id: 'p', type: 'trait', points: [{ x: 5, y: 5 }], couleur: '#000000', epaisseur: 1 });
    const pdf = await PDFDocument.load(await exporterPdf(d));
    expect(pdf.getPageCount()).toBe(2);
    expect(pdf.getPage(0).getWidth()).toBeCloseTo(595.28, 0);
  });
});

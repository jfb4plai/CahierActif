import { PDFDocument } from 'pdf-lib';
import { ptVersMm } from '../lib/units';
import type { TaillePage } from '../model/types';

export class PdfIllisibleError extends Error {
  constructor() {
    super('Ce PDF est protégé ou abîmé : impossible de l’ouvrir. Demandez une autre version à votre enseignant.');
  }
}

export async function taillesPagesPdf(data: ArrayBuffer): Promise<TaillePage[]> {
  let pdf: PDFDocument;
  try {
    // pdf-lib refuse les PDF chiffrés (EncryptedPDFError) : même message que pour un PDF abîmé.
    pdf = await PDFDocument.load(data);
  } catch {
    throw new PdfIllisibleError();
  }
  return pdf.getPages().map(p => {
    const { width, height } = p.getCropBox(); // zone visible, pas la MediaBox
    const r = ((p.getRotation().angle % 360) + 360) % 360;
    const [w, h] = r === 90 || r === 270 ? [height, width] : [width, height];
    return { largeurMm: ptVersMm(w), hauteurMm: ptVersMm(h) };
  });
}

export async function aDesPagesTournees(data: ArrayBuffer): Promise<boolean> {
  const pdf = await PDFDocument.load(data);
  return pdf.getPages().some(p => p.getRotation().angle % 360 !== 0);
}

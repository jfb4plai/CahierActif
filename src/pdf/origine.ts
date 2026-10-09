import { rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { hexVersRgb01 } from '../lib/couleurs';
import { mmVersPt } from '../lib/units';

export const K = mmVersPt(1); // pt par mm

// Le modèle part du coin haut-gauche de la zone visible (CropBox), pas de la MediaBox.
export type Origine = { x0: number; haut: number };
export const X = (r: Origine, mm: number) => r.x0 + mm * K;
export const Y = (r: Origine, mm: number) => r.haut - mm * K;

export function origine(p: PDFPage): Origine {
  const cb = p.getCropBox();
  return { x0: cb.x, haut: cb.y + cb.height };
}

export const couleur = (hex: string) => {
  const c = hexVersRgb01(hex);
  return rgb(c.r, c.g, c.b);
};

/** Helvetica ne couvre que WinAnsi : tout caractère non encodable devient « ? ». */
export function encodable(font: PDFFont, texte: string): string {
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

import { describe, it, expect, vi } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { exporterPdf } from './export';
import { ajouterObjet, nouveauDocVierge } from '../model/ops';
import { creerOperation, ecrireCellule } from '../maths/operation';
import { creerFraction } from '../maths/fraction';
import { ajouterPoint, creerRepere, versMm } from '../maths/repere';
import type { Expression } from '../model/types';

// PNG 1 × 1 valide
const PNG = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'));

async function texte(octets: Uint8Array): Promise<string> {
  const d = await pdfjs.getDocument({ data: octets.slice() }).promise;
  const c = await (await d.getPage(1)).getTextContent();
  return c.items.map(i => ('str' in i ? i.str : '')).join(' ');
}

const expr = (latex: string): Expression => ({ id: 'e', type: 'expression', x: 20, y: 200, latex, taillePt: 16, couleur: '#000000', largeurMm: 20, hauteurMm: 8 });

describe('export des objets maths', () => {
  it('opération : chiffres, retenue et signe écrits', async () => {
    let o = creerOperation(20, 20, { operateur: '+', colonnes: 2, lignes: 3, virgule: 1, chiffresDiviseur: 1, couleurs: true }, '#000000');
    o = ecrireCellule(ecrireCellule(ecrireCellule(o, 'case', 0, '4'), 'case', 1, '7'), 'retenue', 0, '1');
    const t = await texte(await exporterPdf(ajouterObjet(nouveauDocVierge('E', 'p3p6'), 0, o)));
    expect(t).toContain('4');
    expect(t).toContain('7');
    expect(t).toContain('1');
    expect(t).toContain('+');
  });

  it('division : signe absent, diviseur écrit', async () => {
    let o = creerOperation(20, 20, { operateur: '÷', colonnes: 3, lignes: 2, virgule: null, chiffresDiviseur: 1, couleurs: false }, '#000000');
    o = ecrireCellule(o, 'diviseur', 0, '6');
    const t = await texte(await exporterPdf(ajouterObjet(nouveauDocVierge('E', 'p3p6'), 0, o)));
    expect(t).toContain('6');
  });

  it('fraction : numérateur et dénominateur', async () => {
    const f = { ...creerFraction(30, 30, '#000000'), numerateur: '3', denominateur: '4' };
    const t = await texte(await exporterPdf(ajouterObjet(nouveauDocVierge('E', 'p3p6'), 0, f)));
    expect(t).toContain('3');
    expect(t).toContain('4');
  });

  it('repère : étiquette du point à la belge', async () => {
    let r = creerRepere(20, 60, { xmin: -2, xmax: 3, ymin: -1, ymax: 3, uniteMm: 10 }, '#000000');
    const p = versMm(r, 2, 1.5);
    r = ajouterPoint(r, p.x, p.y);
    const t = await texte(await exporterPdf(ajouterObjet(nouveauDocVierge('E', 'secondaire'), 0, r)));
    expect(t).toContain('A(2 ; 1,5)');
  });

  it('expression : image fournie par le rasteriseur', async () => {
    const rendre = vi.fn(async () => PNG);
    const out = await exporterPdf(ajouterObjet(nouveauDocVierge('E', 'secondaire'), 0, expr('x^2')), { rendreExpression: rendre });
    expect(rendre).toHaveBeenCalledOnce();
    expect((await PDFDocument.load(out)).getPageCount()).toBe(1);
  });

  it('expression sans rasteriseur (ou en échec) : LaTeX écrit en texte', async () => {
    const t1 = await texte(await exporterPdf(ajouterObjet(nouveauDocVierge('E', 'secondaire'), 0, expr('x+1'))));
    expect(t1).toContain('x+1');
    const echec = async () => { throw new Error('canvas'); };
    const t2 = await texte(await exporterPdf(ajouterObjet(nouveauDocVierge('E', 'secondaire'), 0, expr('y-2')), { rendreExpression: echec }));
    expect(t2).toContain('y-2');
  });
});

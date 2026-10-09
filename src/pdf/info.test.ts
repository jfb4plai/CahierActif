import { describe, it, expect } from 'vitest';
import { PDFDocument, degrees } from 'pdf-lib';
import { taillesPagesPdf, PdfIllisibleError } from './info';

async function pdf(): Promise<ArrayBuffer> {
  const d = await PDFDocument.create();
  d.addPage([595.28, 841.89]);
  d.addPage([595.28, 841.89]).setRotation(degrees(90));
  const o = await d.save();
  return o.buffer.slice(o.byteOffset, o.byteOffset + o.byteLength) as ArrayBuffer;
}

describe('taillesPagesPdf', () => {
  it('renvoie la taille en mm, en tenant compte de la rotation', async () => {
    const t = await taillesPagesPdf(await pdf());
    expect(t).toHaveLength(2);
    expect(t[0].largeurMm).toBeCloseTo(210, 0);
    expect(t[0].hauteurMm).toBeCloseTo(297, 0);
    expect(t[1].largeurMm).toBeCloseTo(297, 0);
    expect(t[1].hauteurMm).toBeCloseTo(210, 0);
  });

  it('ne détache pas le tampon fourni', async () => {
    const data = await pdf();
    await taillesPagesPdf(data);
    expect(data.byteLength).toBeGreaterThan(0);
  });

  it('PDF abîmé → PdfIllisibleError avec message pour l’élève', async () => {
    await expect(taillesPagesPdf(new Uint8Array([1, 2, 3]).buffer)).rejects.toBeInstanceOf(PdfIllisibleError);
    await expect(taillesPagesPdf(new Uint8Array([1, 2, 3]).buffer)).rejects.toThrow('Ce PDF est protégé ou abîmé');
  });

  it('renvoie la taille de la CropBox (zone visible), pas celle de la MediaBox', async () => {
    const d = await PDFDocument.create();
    d.addPage([595.28, 841.89]).setCropBox(50, 100, 283.46, 425.2); // 100 × 150 mm
    const o = await d.save();
    const t = await taillesPagesPdf(o.buffer.slice(o.byteOffset, o.byteOffset + o.byteLength) as ArrayBuffer);
    expect(t[0].largeurMm).toBeCloseTo(100, 1);
    expect(t[0].hauteurMm).toBeCloseTo(150, 1);
  });
});

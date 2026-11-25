import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { exporterPdf } from './export';
import { extraireDocument } from './extraire';
import { ajouterObjet, ajouterPageVierge, deplacerPage, nouveauDocPdf, nouveauDocPhotos, nouveauDocVierge } from '../model/ops';
import type { Trait } from '../model/types';

const K = 72 / 25.4;
const trait = (id: string): Trait => ({ id, type: 'trait', points: [{ x: 1, y: 1 }, { x: 9, y: 9 }], couleur: '#000000', epaisseur: 0.8 });

// PDF de 3 pages de largeurs différentes : 100, 120 et 140 mm.
async function pdf3(): Promise<{ data: ArrayBuffer; tailles: { largeurMm: number; hauteurMm: number }[] }> {
  const d = await PDFDocument.create();
  for (const w of [100, 120, 140]) d.addPage([w * K, 200 * K]);
  const o = await d.save();
  return {
    data: o.buffer.slice(o.byteOffset, o.byteOffset + o.byteLength) as ArrayBuffer,
    tailles: [100, 120, 140].map(w => ({ largeurMm: w, hauteurMm: 200 })),
  };
}
const largeurs = async (octets: Uint8Array) => (await PDFDocument.load(octets)).getPages().map(p => Math.round(p.getWidth() / K));

describe('export après changement d’ordre', () => {
  it('PDF : les pages sortent dans le nouvel ordre avec leurs annotations', async () => {
    const { data, tailles } = await pdf3();
    let d = nouveauDocPdf('F', 'p3p6', data, tailles);
    d = ajouterObjet(d, 2, trait('t')); // annotation sur la 3e page (140 mm)
    d = deplacerPage(d, 2, -1); // 100, 140, 120
    expect(d.pages.map(p => p.largeurMm)).toEqual([100, 140, 120]);
    expect(await largeurs(await exporterPdf(d))).toEqual([100, 140, 120]);
  });
  it('PDF jamais réordonné : chemin inchangé', async () => {
    const { data, tailles } = await pdf3();
    expect(await largeurs(await exporterPdf(nouveauDocPdf('F', 'p3p6', data, tailles)))).toEqual([100, 120, 140]);
  });
});

describe('extraireDocument', () => {
  it('PDF : seulement les pages choisies, dans l’ordre donné, annotations gardées, original intact', async () => {
    const { data, tailles } = await pdf3();
    let d = nouveauDocPdf('Fiche', 'p3p6', data, tailles);
    d = ajouterObjet(d, 2, trait('t'));
    const n = await extraireDocument(d, [2, 0], 'Fiche (pages 3 et 1)');
    expect(n.id).not.toBe(d.id);
    expect(n.titre).toBe('Fiche (pages 3 et 1)');
    expect(n.pages.map(p => p.largeurMm)).toEqual([140, 100]);
    expect(n.pages[0].objets).toHaveLength(1);
    expect(n.source.type === 'pdf' && (await largeurs(new Uint8Array(n.source.data)))).toEqual([140, 100]);
    expect(d.pages).toHaveLength(3);
    expect(await largeurs(await exporterPdf(n))).toEqual([140, 100]);
  });
  it('document déjà réordonné : on extrait selon l’ordre affiché', async () => {
    const { data, tailles } = await pdf3();
    let d = deplacerPage(nouveauDocPdf('F', 'p3p6', data, tailles), 0, 1); // 120, 100, 140
    const n = await extraireDocument(d, [0], 'x');
    expect(n.pages[0].largeurMm).toBe(120);
    expect(n.source.type === 'pdf' && (await largeurs(new Uint8Array(n.source.data)))).toEqual([120]);
  });
  it('photos : seulement les photos des pages choisies', async () => {
    const img = (n: number) => ({ mime: 'image/jpeg' as const, data: new Uint8Array([n]).buffer });
    const t = { largeurMm: 210, hauteurMm: 297 };
    const d = nouveauDocPhotos('F', 'p3p6', [img(1), img(2), img(3)], [t, t, t]);
    const n = await extraireDocument(d, [1, 2], 'x');
    expect(n.source.type === 'photos' && n.source.images.map(i => new Uint8Array(i.data)[0])).toEqual([2, 3]);
    expect(n.pages.map(p => p.origine)).toEqual([0, 1]);
  });
  it('page blanche : pages et annotations extraites', async () => {
    let d = ajouterPageVierge(nouveauDocVierge('V', 'p3p6'));
    d = ajouterObjet(d, 1, trait('t'));
    const n = await extraireDocument(d, [1], 'x');
    expect(n.source.type).toBe('vierge');
    expect(n.pages).toHaveLength(1);
    expect(n.pages[0].objets).toHaveLength(1);
  });
  it('rien à extraire : erreur', async () => {
    await expect(extraireDocument(nouveauDocVierge('V', 'p3p6'), [], 'x')).rejects.toThrow(RangeError);
    await expect(extraireDocument(nouveauDocVierge('V', 'p3p6'), [5], 'x')).rejects.toThrow(RangeError);
  });
});

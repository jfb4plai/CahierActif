import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { versCahier, depuisCahier } from './cahier';
import { ajouterObjet, nouveauDocPdf, nouveauDocVierge } from '../model/ops';
import type { CahierDoc } from '../model/types';

describe('.cahier', () => {
  it('aller-retour d’un document PDF annoté (nouvel id, reste identique)', async () => {
    const octets = new Uint8Array([1, 2, 3, 4]).buffer;
    let d = nouveauDocPdf('Fiche', 'p3p6', octets, [{ largeurMm: 210, hauteurMm: 297 }]);
    d = ajouterObjet(d, 0, { id: 'a', type: 'texte', x: 1, y: 1, largeur: 50, texte: 'élève', taillePt: 14, couleur: '#000000' });
    const blob = await versCahier(d);
    const lu = await depuisCahier(await blob.arrayBuffer());
    expect(lu.id).not.toBe(d.id);
    expect({ ...lu, id: d.id, source: null }).toEqual({ ...d, source: null });
    expect(lu.source.type).toBe('pdf');
    if (lu.source.type === 'pdf') expect(new Uint8Array(lu.source.data)).toEqual(new Uint8Array([1, 2, 3, 4]));
  });

  it('aller-retour d’un document de photos', async () => {
    const d: CahierDoc = {
      ...nouveauDocVierge('Photo', 'p1p2'),
      source: { type: 'photos', images: [{ mime: 'image/jpeg', data: new Uint8Array([9, 9]).buffer }] },
    };
    const lu = await depuisCahier(await (await versCahier(d)).arrayBuffer());
    expect(lu.source.type).toBe('photos');
    if (lu.source.type === 'photos') {
      expect(lu.source.images[0].mime).toBe('image/jpeg');
      expect(new Uint8Array(lu.source.images[0].data)).toEqual(new Uint8Array([9, 9]));
    }
  });

  it('refuse un zip qui n’est pas un cahier', async () => {
    const z = new JSZip();
    z.file('autre.txt', 'x');
    const data = await z.generateAsync({ type: 'arraybuffer' });
    await expect(depuisCahier(data)).rejects.toThrow('Ce fichier n’est pas un fichier CahierActif.');
  });

  it('refuse une version plus récente', async () => {
    const z = new JSZip();
    z.file('manifeste.json', JSON.stringify({ format: 'cahieractif', version: 99 }));
    const data = await z.generateAsync({ type: 'arraybuffer' });
    await expect(depuisCahier(data)).rejects.toThrow('version plus récente');
  });

  it('refuse un fichier qui n’est pas un zip', async () => {
    await expect(depuisCahier(new Uint8Array([1, 2, 3]).buffer)).rejects.toThrow('Ce fichier n’est pas un fichier CahierActif.');
  });

  it('refuse un document.json qui n’est pas du JSON', async () => {
    const z = new JSZip();
    z.file('manifeste.json', JSON.stringify({ format: 'cahieractif', version: 1 }));
    z.file('document.json', '{ pas du json');
    const data = await z.generateAsync({ type: 'arraybuffer' });
    await expect(depuisCahier(data)).rejects.toThrow('Ce fichier n’est pas un fichier CahierActif.');
  });

  it('refuse un manifeste illisible', async () => {
    const z = new JSZip();
    z.file('manifeste.json', 'null');
    const data = await z.generateAsync({ type: 'arraybuffer' });
    await expect(depuisCahier(data)).rejects.toThrow('Ce fichier n’est pas un fichier CahierActif.');
  });

  it('refuse un document sans pages', async () => {
    const z = new JSZip();
    z.file('manifeste.json', JSON.stringify({ format: 'cahieractif', version: 1 }));
    const { pages: _, ...sansPages } = nouveauDocVierge('X', 'p3p6');
    z.file('document.json', JSON.stringify({ ...sansPages, source: { type: 'vierge' } }));
    const data = await z.generateAsync({ type: 'arraybuffer' });
    await expect(depuisCahier(data)).rejects.toThrow('Ce fichier n’est pas un fichier CahierActif.');
  });

  it('refuse un niveau inconnu', async () => {
    const z = new JSZip();
    z.file('manifeste.json', JSON.stringify({ format: 'cahieractif', version: 1 }));
    z.file('document.json', JSON.stringify({ ...nouveauDocVierge('X', 'p3p6'), niveau: 'college', source: { type: 'vierge' } }));
    const data = await z.generateAsync({ type: 'arraybuffer' });
    await expect(depuisCahier(data)).rejects.toThrow('Ce fichier n’est pas un fichier CahierActif.');
  });
});

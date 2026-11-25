import { PDFDocument } from 'pdf-lib';
import { nouvelId } from '../model/types';
import type { CahierDoc, ImageSource, Source } from '../model/types';

/**
 * Nouveau document contenant seulement les pages `indices` (positions dans `doc`, dans l'ordre donné),
 * avec leurs annotations. Le document d'origine n'est pas modifié. Un PDF est réduit aux pages gardées.
 */
export async function extraireDocument(doc: CahierDoc, indices: number[], titre: string): Promise<CahierDoc> {
  const gardees = [...new Set(indices)].filter(i => i >= 0 && i < doc.pages.length);
  if (gardees.length === 0) throw new RangeError('aucune page à extraire');
  const maintenant = Date.now();
  const pages = gardees.map((i, k) => ({ ...doc.pages[i], origine: k }));
  let source: Source;
  if (doc.source.type === 'pdf') {
    const src = await PDFDocument.load(doc.source.data.slice(0));
    const out = await PDFDocument.create();
    for (const p of await out.copyPages(src, gardees.map(i => doc.pages[i].origine ?? i))) out.addPage(p);
    const octets = await out.save();
    source = { type: 'pdf', data: octets.buffer.slice(octets.byteOffset, octets.byteOffset + octets.byteLength) as ArrayBuffer };
  } else if (doc.source.type === 'photos') {
    const images: ImageSource[] = gardees.map(i => (doc.source as { images: ImageSource[] }).images[doc.pages[i].origine ?? i]);
    source = { type: 'photos', images };
  } else {
    source = { type: 'vierge' };
  }
  return { id: nouvelId(), titre, niveau: doc.niveau, cree: maintenant, modifie: maintenant, source, pages };
}

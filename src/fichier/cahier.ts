import JSZip from 'jszip';
import { nouvelId } from '../model/types';
import type { CahierDoc, ImageSource, Source } from '../model/types';

const FORMAT = 'cahieractif';
const VERSION = 1;
const ERREUR_FORMAT = 'Ce fichier n’est pas un fichier CahierActif.';

type SourceDecrite = { type: 'pdf' } | { type: 'vierge' } | { type: 'photos'; mimes: ImageSource['mime'][] };

export async function versCahier(doc: CahierDoc): Promise<Blob> {
  const zip = new JSZip();
  let source: SourceDecrite;
  if (doc.source.type === 'pdf') {
    zip.file('source.pdf', doc.source.data);
    source = { type: 'pdf' };
  } else if (doc.source.type === 'photos') {
    doc.source.images.forEach((img, i) => zip.file(`images/${i}`, img.data));
    source = { type: 'photos', mimes: doc.source.images.map(i => i.mime) };
  } else {
    source = { type: 'vierge' };
  }
  zip.file('manifeste.json', JSON.stringify({ format: FORMAT, version: VERSION }));
  zip.file('document.json', JSON.stringify({ ...doc, source }));
  const octets = await zip.generateAsync({ type: 'uint8array' });
  return new Blob([octets as BlobPart], { type: 'application/zip' });
}

function lireJson(texte: string): unknown {
  try {
    return JSON.parse(texte);
  } catch {
    throw new Error(ERREUR_FORMAT);
  }
}

const NIVEAUX = ['p1p2', 'p3p6', 'secondaire'];

function formeValide(d: unknown): d is Omit<CahierDoc, 'source'> & { source: SourceDecrite } {
  if (typeof d !== 'object' || d === null) return false;
  const doc = d as Record<string, unknown>;
  const source = doc.source as Record<string, unknown> | null | undefined;
  return (
    typeof doc.titre === 'string' &&
    NIVEAUX.includes(doc.niveau as string) &&
    typeof source === 'object' && source !== null &&
    (source.type === 'pdf' || source.type === 'vierge' || (source.type === 'photos' && Array.isArray(source.mimes))) &&
    Array.isArray(doc.pages) &&
    doc.pages.every(
      (p: unknown) =>
        typeof p === 'object' && p !== null &&
        typeof (p as Record<string, unknown>).largeurMm === 'number' &&
        typeof (p as Record<string, unknown>).hauteurMm === 'number' &&
        typeof (p as Record<string, unknown>).fond === 'string' &&
        Array.isArray((p as Record<string, unknown>).objets),
    )
  );
}

export async function depuisCahier(data: ArrayBuffer): Promise<CahierDoc> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(data);
  } catch {
    throw new Error(ERREUR_FORMAT);
  }
  const manifeste = await zip.file('manifeste.json')?.async('string');
  if (!manifeste) throw new Error(ERREUR_FORMAT);
  const m = lireJson(manifeste) as { format?: unknown; version?: unknown } | null;
  if (!m || m.format !== FORMAT) throw new Error(ERREUR_FORMAT);
  if (typeof m.version === 'number' && m.version > VERSION) throw new Error('Fichier créé par une version plus récente de CahierActif : mettez l’application à jour.');

  const brut = await zip.file('document.json')?.async('string');
  if (!brut) throw new Error(ERREUR_FORMAT);
  const doc = lireJson(brut);
  if (!formeValide(doc)) throw new Error(ERREUR_FORMAT);

  let source: Source;
  if (doc.source.type === 'pdf') {
    const pdf = await zip.file('source.pdf')?.async('arraybuffer');
    if (!pdf) throw new Error(ERREUR_FORMAT);
    source = { type: 'pdf', data: pdf };
  } else if (doc.source.type === 'photos') {
    const images: ImageSource[] = [];
    for (let i = 0; i < doc.source.mimes.length; i++) {
      const img = await zip.file(`images/${i}`)?.async('arraybuffer');
      if (!img) throw new Error(ERREUR_FORMAT);
      images.push({ mime: doc.source.mimes[i], data: img });
    }
    source = { type: 'photos', images };
  } else {
    source = { type: 'vierge' };
  }
  // Nouvel id : réimporter ne doit jamais écraser un travail local plus récent.
  return { ...doc, id: nouvelId(), source };
}

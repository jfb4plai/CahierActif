import JSZip from 'jszip';
import type { CahierDoc, Dossier } from '../model/types';
import { depuisCahier, versCahier } from './cahier';

/**
 * Fichier de cours (.cahiers) : un seul fichier qui contient tous les documents d'un cours, chacun au format .cahier,
 * avec le nom et la couleur du cours. Pour envoyer un cours entier sur un autre appareil en un seul envoi.
 */
const FORMAT_COURS = 'cahieractif-cours';
const VERSION = 1;
const ERREUR_COURS = 'Ce fichier n’est pas un fichier de cours CahierActif.';
export const EXTENSION_COURS = '.cahiers';

export type CoursRecu = { nom: string; couleur?: string; documents: CahierDoc[] };

export async function versCours(cours: Pick<Dossier, 'nom' | 'couleur'>, documents: CahierDoc[]): Promise<Blob> {
  if (documents.length === 0) throw new RangeError('aucun document dans ce cours');
  const zip = new JSZip();
  const fichiers: string[] = [];
  for (const [i, d] of documents.entries()) {
    const chemin = `documents/${i}.cahier`;
    // Déjà compressé (zip dans le zip) : stocké tel quel, sans recompression coûteuse.
    zip.file(chemin, await (await versCahier(d)).arrayBuffer(), { compression: 'STORE' });
    fichiers.push(chemin);
  }
  zip.file('manifeste.json', JSON.stringify({
    format: FORMAT_COURS,
    version: VERSION,
    cours: { nom: cours.nom, ...(cours.couleur ? { couleur: cours.couleur } : {}) },
    documents: fichiers,
  }));
  const octets = await zip.generateAsync({ type: 'uint8array', compression: 'STORE' });
  return new Blob([octets as BlobPart], { type: 'application/zip' });
}

type Manifeste = { format?: unknown; version?: unknown; cours?: { nom?: unknown; couleur?: unknown }; documents?: unknown };

async function lireManifeste(zip: JSZip): Promise<Manifeste | null> {
  const brut = await zip.file('manifeste.json')?.async('string');
  if (!brut) return null;
  try {
    const m = JSON.parse(brut);
    return typeof m === 'object' && m !== null ? (m as Manifeste) : null;
  } catch {
    return null;
  }
}

/** Reconnaît le contenu d'un fichier choisi : un document (.cahier), un cours (.cahiers), ou rien de connu. */
export async function typeDeFichier(data: ArrayBuffer): Promise<'document' | 'cours' | null> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(data);
  } catch {
    return null;
  }
  const m = await lireManifeste(zip);
  if (m?.format === FORMAT_COURS) return 'cours';
  if (m?.format === 'cahieractif') return 'document';
  return null;
}

export async function depuisCours(data: ArrayBuffer): Promise<CoursRecu> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(data);
  } catch {
    throw new Error(ERREUR_COURS);
  }
  const m = await lireManifeste(zip);
  if (!m || m.format !== FORMAT_COURS) throw new Error(ERREUR_COURS);
  if (typeof m.version === 'number' && m.version > VERSION) {
    throw new Error('Fichier créé par une version plus récente de CahierActif : mettez l’application à jour.');
  }
  const nom = typeof m.cours?.nom === 'string' ? m.cours.nom.trim() : '';
  if (!nom || !Array.isArray(m.documents) || m.documents.length === 0) throw new Error(ERREUR_COURS);
  const documents: CahierDoc[] = [];
  for (const chemin of m.documents) {
    const f = typeof chemin === 'string' ? zip.file(chemin) : null;
    if (!f) throw new Error(ERREUR_COURS);
    documents.push(await depuisCahier(await f.async('arraybuffer'))); // nouvel identifiant pour chaque document
  }
  return { nom, couleur: typeof m.cours?.couleur === 'string' ? m.cours.couleur : undefined, documents };
}

import { depuisCours, versCours, type CoursRecu } from '../fichier/cours';
import { nouvelId } from '../model/types';
import type { CahierDoc, Dossier } from '../model/types';
import type { StorageAdapter } from '../storage/adapter';
import { PALETTE_COURS, SANS_COULEUR, premiereCouleurLibre } from './couleursCours';
import { NOM_MAX } from './dossiers';

/** Charge les documents du cours et en fait un fichier .cahiers ; null si le cours est vide. */
export async function preparerEnvoi(stockage: StorageAdapter, cours: Dossier): Promise<{ fichier: Blob; nombre: number } | null> {
  const metas = (await stockage.lister()).filter(m => m.dossierId === cours.id);
  const documents: CahierDoc[] = [];
  for (const m of metas) {
    const d = await stockage.charger(m.id);
    if (d) documents.push(d);
  }
  if (documents.length === 0) return null;
  return { fichier: await versCours(cours, documents), nombre: documents.length };
}

/**
 * Range un cours reçu : le cours du même nom s'il existe déjà (sans doublon de cours), sinon un nouveau cours avec
 * la couleur envoyée (si elle est connue) ou la première couleur libre. Les documents reçus sont des copies neuves.
 */
export async function recevoirCours(
  stockage: StorageAdapter,
  recu: CoursRecu,
  dossiersExistants: Dossier[],
): Promise<{ dossier: Dossier; cree: boolean }> {
  const nom = recu.nom.trim().slice(0, NOM_MAX);
  const cle = nom.toLocaleLowerCase('fr');
  let dossier = dossiersExistants.find(d => d.nom.toLocaleLowerCase('fr') === cle);
  let cree = false;
  if (!dossier) {
    const connue = recu.couleur === SANS_COULEUR || PALETTE_COURS.some(c => c.id === recu.couleur);
    dossier = { id: nouvelId(), nom, cree: Date.now(), couleur: connue ? recu.couleur : premiereCouleurLibre(dossiersExistants) };
    await stockage.enregistrerDossier(dossier);
    cree = true;
  }
  for (const d of recu.documents) {
    await stockage.enregistrer(d);
    await stockage.deplacer(d.id, dossier.id);
  }
  return { dossier, cree };
}

/** Lit un fichier .cahiers puis le range (voir recevoirCours). */
export async function importerCours(stockage: StorageAdapter, data: ArrayBuffer, dossiersExistants: Dossier[]) {
  const recu = await depuisCours(data);
  const r = await recevoirCours(stockage, recu, dossiersExistants);
  return { ...r, nombre: recu.documents.length };
}

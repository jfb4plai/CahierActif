import type { Dossier } from '../model/types';
import type { StorageAdapter } from '../storage/adapter';

/** Cours proposés au premier lancement ; l'élève peut les renommer, les supprimer et en ajouter. */
export const DOSSIERS_PAR_DEFAUT = ['Français', 'Mathématiques', 'Sciences', 'Histoire', 'Géographie', 'Langues'];

const CLE_AMORCE = 'cahieractif.dossiers-amorces';
export const NOM_MAX = 40;

/** Crée les cours par défaut une seule fois par appareil : un cours supprimé ne revient pas. */
export async function amorcerDossiers(stockage: StorageAdapter, mem: Pick<Storage, 'getItem' | 'setItem'> = localStorage): Promise<void> {
  if (mem.getItem(CLE_AMORCE)) return;
  if ((await stockage.listerDossiers()).length === 0) {
    const t0 = Date.now();
    // Identifiants fixes : deux amorçages simultanés (double montage React, deux onglets) écrivent les mêmes fiches.
    for (const [i, nom] of DOSSIERS_PAR_DEFAUT.entries()) {
      await stockage.enregistrerDossier({ id: `defaut-${i}`, nom, cree: t0 + i });
    }
  }
  mem.setItem(CLE_AMORCE, '1');
}

/** Nom nettoyé, ou le message à montrer à l'élève. */
export function verifierNomDossier(brut: string, existants: Dossier[], ignorerId?: string): { nom: string } | { erreur: string } {
  const nom = brut.replace(/\s+/g, ' ').trim();
  if (!nom) return { erreur: 'Écrire un nom pour le dossier.' };
  if (nom.length > NOM_MAX) return { erreur: `Nom trop long : ${NOM_MAX} lettres au maximum.` };
  const cle = nom.toLocaleLowerCase('fr');
  if (existants.some(d => d.id !== ignorerId && d.nom.toLocaleLowerCase('fr') === cle)) {
    return { erreur: `Un dossier « ${nom} » existe déjà.` };
  }
  return { nom };
}

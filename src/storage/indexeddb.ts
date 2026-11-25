import { openDB } from 'idb';
import type { CahierDoc, Dossier } from '../model/types';
import type { MetaDoc, StorageAdapter } from './adapter';

// "docs" = documents complets ; "meta" = fiches légères (liste rapide sans charger les PDF, et classement) ;
// "dossiers" = cours de la bibliothèque (ajouté en version 2 de la base).
export function creerIndexedDBAdapter(nomBase = 'cahieractif'): StorageAdapter {
  const db = openDB(nomBase, 2, {
    upgrade(d, ancienne) {
      if (ancienne < 1) {
        d.createObjectStore('docs', { keyPath: 'id' });
        d.createObjectStore('meta', { keyPath: 'id' });
      }
      if (ancienne < 2) d.createObjectStore('dossiers', { keyPath: 'id' });
    },
  });

  const sansDossier = (m: MetaDoc): MetaDoc => {
    const { dossierId: _ancien, ...reste } = m;
    return reste;
  };

  return {
    async lister() {
      const metas: MetaDoc[] = await (await db).getAll('meta');
      return metas.sort((a, b) => b.modifie - a.modifie);
    },
    async charger(id) {
      return (await db).get('docs', id);
    },
    async enregistrer(doc: CahierDoc) {
      const tx = (await db).transaction(['docs', 'meta'], 'readwrite');
      const ancienne: MetaDoc | undefined = await tx.objectStore('meta').get(doc.id);
      const meta: MetaDoc = { id: doc.id, titre: doc.titre, modifie: doc.modifie };
      if (ancienne?.dossierId) meta.dossierId = ancienne.dossierId;
      await Promise.all([tx.objectStore('docs').put(doc), tx.objectStore('meta').put(meta), tx.done]);
    },
    async supprimer(id) {
      const tx = (await db).transaction(['docs', 'meta'], 'readwrite');
      await Promise.all([tx.objectStore('docs').delete(id), tx.objectStore('meta').delete(id), tx.done]);
    },
    async deplacer(id, dossierId) {
      const tx = (await db).transaction('meta', 'readwrite');
      const m: MetaDoc | undefined = await tx.store.get(id);
      if (m) await tx.store.put(dossierId ? { ...sansDossier(m), dossierId } : sansDossier(m));
      await tx.done;
    },
    async listerDossiers() {
      const ds: Dossier[] = await (await db).getAll('dossiers');
      return ds.sort((a, b) => a.cree - b.cree || a.nom.localeCompare(b.nom, 'fr'));
    },
    async enregistrerDossier(d) {
      await (await db).put('dossiers', d);
    },
    async supprimerDossier(id) {
      const tx = (await db).transaction(['dossiers', 'meta'], 'readwrite');
      let curseur = await tx.objectStore('meta').openCursor();
      while (curseur) {
        if ((curseur.value as MetaDoc).dossierId === id) await curseur.update(sansDossier(curseur.value as MetaDoc));
        curseur = await curseur.continue();
      }
      await Promise.all([tx.objectStore('dossiers').delete(id), tx.done]);
    },
  };
}

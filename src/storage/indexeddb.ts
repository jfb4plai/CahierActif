import { openDB } from 'idb';
import type { CahierDoc } from '../model/types';
import type { MetaDoc, StorageAdapter } from './adapter';

// Deux magasins : "meta" pour lister vite sans charger les PDF.
export function creerIndexedDBAdapter(nomBase = 'cahieractif'): StorageAdapter {
  const db = openDB(nomBase, 1, {
    upgrade(d) {
      d.createObjectStore('docs', { keyPath: 'id' });
      d.createObjectStore('meta', { keyPath: 'id' });
    },
  });

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
      await Promise.all([
        tx.objectStore('docs').put(doc),
        tx.objectStore('meta').put({ id: doc.id, titre: doc.titre, modifie: doc.modifie }),
        tx.done,
      ]);
    },
    async supprimer(id) {
      const tx = (await db).transaction(['docs', 'meta'], 'readwrite');
      await Promise.all([tx.objectStore('docs').delete(id), tx.objectStore('meta').delete(id), tx.done]);
    },
  };
}

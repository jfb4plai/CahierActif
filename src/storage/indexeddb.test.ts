import 'fake-indexeddb/auto';
import { openDB } from 'idb';
import { describe, it, expect } from 'vitest';
import { creerIndexedDBAdapter } from './indexeddb';
import { nouveauDocPdf, nouveauDocVierge } from '../model/ops';

let n = 0;
const base = () => `test-${n++}`;

describe('IndexedDBAdapter', () => {
  it('enregistre, charge, liste et supprime', async () => {
    const a = creerIndexedDBAdapter(base());
    const d = nouveauDocVierge('Fiche 1', 'p3p6');
    await a.enregistrer(d);
    expect(await a.charger(d.id)).toEqual(d);
    expect(await a.lister()).toEqual([{ id: d.id, titre: 'Fiche 1', modifie: d.modifie }]);
    await a.supprimer(d.id);
    expect(await a.charger(d.id)).toBeUndefined();
    expect(await a.lister()).toEqual([]);
  });

  it('conserve les octets du PDF', async () => {
    const a = creerIndexedDBAdapter(base());
    const octets = new Uint8Array([37, 80, 68, 70]).buffer;
    const d = nouveauDocPdf('PDF', 'secondaire', octets, [{ largeurMm: 210, hauteurMm: 297 }]);
    await a.enregistrer(d);
    const lu = await a.charger(d.id);
    expect(lu?.source.type).toBe('pdf');
    if (lu?.source.type === 'pdf') expect(new Uint8Array(lu.source.data)).toEqual(new Uint8Array([37, 80, 68, 70]));
  });

  it('liste du plus récent au plus ancien', async () => {
    const a = creerIndexedDBAdapter(base());
    const vieux = { ...nouveauDocVierge('Vieux', 'p3p6'), modifie: 1000 };
    const recent = { ...nouveauDocVierge('Récent', 'p3p6'), modifie: 2000 };
    await a.enregistrer(vieux);
    await a.enregistrer(recent);
    expect((await a.lister()).map(m => m.titre)).toEqual(['Récent', 'Vieux']);
  });

  it('classement : déplacer ne touche pas au document, enregistrer garde le dossier', async () => {
    const a = creerIndexedDBAdapter(base());
    const d = nouveauDocVierge('Fiche', 'p3p6');
    await a.enregistrer(d);
    await a.deplacer(d.id, 'maths');
    expect((await a.lister())[0].dossierId).toBe('maths');
    await a.enregistrer({ ...d, modifie: d.modifie + 5 }); // sauvegarde automatique de l'éditeur
    expect((await a.lister())[0]).toMatchObject({ dossierId: 'maths', modifie: d.modifie + 5 });
    expect(await a.charger(d.id)).toEqual({ ...d, modifie: d.modifie + 5 });
    await a.deplacer(d.id, null);
    expect('dossierId' in (await a.lister())[0]).toBe(false);
  });

  it('supprimer un dossier remet ses documents sans dossier, sans les supprimer', async () => {
    const a = creerIndexedDBAdapter(base());
    const x = nouveauDocVierge('X', 'p3p6');
    const y = nouveauDocVierge('Y', 'p3p6');
    await a.enregistrer(x);
    await a.enregistrer(y);
    await a.enregistrerDossier({ id: 'f', nom: 'Français', cree: 1 });
    await a.enregistrerDossier({ id: 'm', nom: 'Maths', cree: 2 });
    await a.deplacer(x.id, 'f');
    await a.deplacer(y.id, 'm');
    await a.supprimerDossier('f');
    const metas = await a.lister();
    expect(metas.find(m => m.id === x.id)?.dossierId).toBeUndefined();
    expect(metas.find(m => m.id === y.id)?.dossierId).toBe('m');
    expect((await a.listerDossiers()).map(d => d.id)).toEqual(['m']);
    expect(await a.charger(x.id)).toBeDefined();
  });

  it('base existante en version 1 : les documents restent, les dossiers apparaissent', async () => {
    const nom = base();
    const ancienne = await openDB(nom, 1, {
      upgrade(d) {
        d.createObjectStore('docs', { keyPath: 'id' });
        d.createObjectStore('meta', { keyPath: 'id' });
      },
    });
    const d = nouveauDocVierge('Avant', 'p3p6');
    await ancienne.put('docs', d);
    await ancienne.put('meta', { id: d.id, titre: d.titre, modifie: d.modifie });
    ancienne.close();
    const a = creerIndexedDBAdapter(nom);
    expect(await a.lister()).toEqual([{ id: d.id, titre: 'Avant', modifie: d.modifie }]);
    expect(await a.charger(d.id)).toEqual(d);
    expect(await a.listerDossiers()).toEqual([]);
    await a.deplacer(d.id, 'f');
    expect((await a.lister())[0].dossierId).toBe('f');
  });

  it('dossiers : créer, renommer, lister par ordre de création', async () => {
    const a = creerIndexedDBAdapter(base());
    await a.enregistrerDossier({ id: '2', nom: 'B', cree: 20 });
    await a.enregistrerDossier({ id: '1', nom: 'A', cree: 10 });
    await a.enregistrerDossier({ id: '2', nom: 'B renommé', cree: 20 });
    expect((await a.listerDossiers()).map(d => d.nom)).toEqual(['A', 'B renommé']);
  });

  it('renomme sans changer la date ni les pages', async () => {
    const a = creerIndexedDBAdapter(base());
    const d = nouveauDocVierge('Page vierge', 'p3p6');
    await a.enregistrer(d);
    await a.renommer(d.id, 'Maths du jeudi');
    expect((await a.charger(d.id))?.titre).toBe('Maths du jeudi');
    expect((await a.charger(d.id))?.modifie).toBe(d.modifie);
    expect(await a.lister()).toEqual([{ id: d.id, titre: 'Maths du jeudi', modifie: d.modifie }]);
    await expect(a.renommer('inconnu', 'x')).rejects.toThrow();
  });

  it('garde la miniature quand le document est réenregistré', async () => {
    const a = creerIndexedDBAdapter(base());
    const d = nouveauDocVierge('Fiche', 'p3p6');
    await a.enregistrer(d);
    await a.enregistrerMiniature(d.id, 'data:image/jpeg;base64,AAAA');
    await a.enregistrer({ ...d, modifie: d.modifie + 1 });
    expect((await a.lister())[0].miniature).toBe('data:image/jpeg;base64,AAAA');
  });
});

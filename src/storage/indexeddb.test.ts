import 'fake-indexeddb/auto';
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
});

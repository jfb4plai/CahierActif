import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { importerCours, preparerEnvoi } from './coursEnvoi';
import { creerIndexedDBAdapter } from '../storage/indexeddb';
import { ajouterObjet, nouveauDocVierge } from '../model/ops';
import type { Dossier, Trait } from '../model/types';

let n = 0;
const base = () => `cours-envoi-${n++}`;
const trait: Trait = { id: 't', type: 'trait', points: [{ x: 1, y: 1 }, { x: 5, y: 5 }], couleur: '#000000', epaisseur: 0.8 };
const buf = (b: Blob) => b.arrayBuffer();

async function coursAvecDocs(a: ReturnType<typeof creerIndexedDBAdapter>, nom: string, titres: string[], couleur?: string) {
  const d: Dossier = { id: `id-${nom}`, nom, cree: 1, ...(couleur ? { couleur } : {}) };
  await a.enregistrerDossier(d);
  for (const t of titres) {
    const doc = ajouterObjet(nouveauDocVierge(t, 'p3p6'), 0, trait);
    await a.enregistrer(doc);
    await a.deplacer(doc.id, d.id);
  }
  return d;
}

describe('envoi et réception d’un cours', () => {
  it('cours vide : rien à envoyer', async () => {
    const a = creerIndexedDBAdapter(base());
    const d = await coursAvecDocs(a, 'Vide', []);
    expect(await preparerEnvoi(a, d)).toBeNull();
  });

  it('envoie seulement les documents du cours, en un seul fichier', async () => {
    const a = creerIndexedDBAdapter(base());
    const fr = await coursAvecDocs(a, 'Français', ['Dictée', 'Lecture']);
    await coursAvecDocs(a, 'Maths', ['Fractions']);
    const envoi = await preparerEnvoi(a, fr);
    expect(envoi?.nombre).toBe(2);
  });

  it('reçoit sur un autre appareil : le cours est recréé avec son nom, sa couleur et ses documents', async () => {
    const source = creerIndexedDBAdapter(base());
    const fr = await coursAvecDocs(source, 'Français', ['Dictée', 'Lecture'], 'rouge');
    const envoi = (await preparerEnvoi(source, fr))!;

    const cible = creerIndexedDBAdapter(base());
    const r = await importerCours(cible, await buf(envoi.fichier), []);
    expect(r).toMatchObject({ cree: true, nombre: 2 });
    expect(r.dossier).toMatchObject({ nom: 'Français', couleur: 'rouge' });
    const metas = await cible.lister();
    expect(metas.map(m => m.titre).sort()).toEqual(['Dictée', 'Lecture']);
    expect(metas.every(m => m.dossierId === r.dossier.id)).toBe(true);
    // les documents reçus ont leurs annotations
    const doc = await cible.charger(metas[0].id);
    expect(doc?.pages[0].objets).toHaveLength(1);
    expect((await cible.listerDossiers()).map(d => d.nom)).toEqual(['Français']);
  });

  it('un cours du même nom existe déjà : les documents y sont rangés, sans second cours', async () => {
    const source = creerIndexedDBAdapter(base());
    const envoi = (await preparerEnvoi(source, await coursAvecDocs(source, 'Sciences', ['Eau'])))!;
    const cible = creerIndexedDBAdapter(base());
    const existant = await coursAvecDocs(cible, 'sciences', ['Déjà là']); // casse différente
    const r = await importerCours(cible, await buf(envoi.fichier), [existant]);
    expect(r.cree).toBe(false);
    expect(r.dossier.id).toBe(existant.id);
    expect((await cible.listerDossiers())).toHaveLength(1);
    expect((await cible.lister()).filter(m => m.dossierId === existant.id).map(m => m.titre).sort()).toEqual(['Déjà là', 'Eau']);
  });

  it('couleur inconnue ou absente : première couleur libre', async () => {
    const source = creerIndexedDBAdapter(base());
    const envoi = (await preparerEnvoi(source, await coursAvecDocs(source, 'Latin', ['Mots'], 'fluo')))!;
    const cible = creerIndexedDBAdapter(base());
    const r = await importerCours(cible, await buf(envoi.fichier), []);
    expect(r.dossier.couleur).toBe('jaune'); // aucune couleur prise sur l'appareil qui reçoit
  });

  it('fichier invalide : erreur claire, rien n’est créé', async () => {
    const cible = creerIndexedDBAdapter(base());
    await expect(importerCours(cible, new Uint8Array([1, 2, 3]).buffer, [])).rejects.toThrow('fichier de cours');
    expect(await cible.listerDossiers()).toEqual([]);
    expect(await cible.lister()).toEqual([]);
  });
});

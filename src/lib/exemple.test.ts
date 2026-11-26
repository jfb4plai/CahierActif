import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { creerIndexedDBAdapter } from '../storage/indexeddb';
import { DOC_EXEMPLE_ID, DOSSIER_EXEMPLE_ID, amorcerExemple, creerDocumentExemple } from './exemple';

let n = 0;
const adaptateur = () => creerIndexedDBAdapter(`exemple-${n++}`);
const memoire = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};

describe('document d’exemple', () => {
  it('a deux pages et tous les types d’annotation', () => {
    const d = creerDocumentExemple();
    expect(d.pages).toHaveLength(2);
    const types = new Set(d.pages.flatMap(p => p.objets.map(o => o.type)));
    for (const t of ['texte', 'trait', 'forme', 'droite', 'operation', 'fraction']) expect(types.has(t as never)).toBe(true);
    expect(d.pages.flatMap(p => p.objets).some(o => o.type === 'trait' && o.surligneur)).toBe(true);
    expect(d.pages[1].fond).toBe('quadrille10');
  });
  it('chaque annotation est précédée d’une étiquette « Commande »', () => {
    const d = creerDocumentExemple();
    const etiquettes = d.pages.flatMap(p => p.objets).filter(o => o.type === 'texte' && o.texte.includes('Commande'));
    expect(etiquettes.length).toBeGreaterThanOrEqual(12);
  });
  it('tout tient dans la page', () => {
    for (const p of creerDocumentExemple().pages) {
      for (const o of p.objets) {
        if (o.type === 'texte') expect(o.x + o.largeur).toBeLessThanOrEqual(p.largeurMm);
        if (o.type === 'forme') expect(o.x + o.largeur).toBeLessThanOrEqual(p.largeurMm);
      }
    }
  });
  it('l’opération est juste : 245 + 378 = 623', () => {
    const op = creerDocumentExemple().pages[1].objets.find(o => o.type === 'operation');
    if (op?.type !== 'operation') throw new Error('opération absente');
    const nb = (ligne: number) => Number(op.cases.slice(ligne * 3, ligne * 3 + 3).join(''));
    expect(nb(0) + nb(1)).toBe(nb(2));
  });
});

describe('amorcerExemple', () => {
  it('crée le cours Exemple et son document, une seule fois', async () => {
    const a = adaptateur(), m = memoire();
    await amorcerExemple(a, m);
    await amorcerExemple(a, m);
    expect((await a.listerDossiers()).filter(d => d.id === DOSSIER_EXEMPLE_ID)).toHaveLength(1);
    const docs = await a.lister();
    expect(docs).toHaveLength(1);
    expect(docs[0].id).toBe(DOC_EXEMPLE_ID);
    expect(docs[0].dossierId).toBe(DOSSIER_EXEMPLE_ID);
  });
  it('un document supprimé ne revient pas', async () => {
    const a = adaptateur(), m = memoire();
    await amorcerExemple(a, m);
    await a.supprimer(DOC_EXEMPLE_ID);
    await amorcerExemple(a, m);
    expect(await a.lister()).toHaveLength(0);
  });
  it('ne réécrit pas un exemple déjà modifié, même si le drapeau a disparu', async () => {
    const a = adaptateur();
    await amorcerExemple(a, memoire());
    await a.renommer(DOC_EXEMPLE_ID, 'Mon exemple');
    await amorcerExemple(a, memoire());
    expect((await a.charger(DOC_EXEMPLE_ID))?.titre).toBe('Mon exemple');
  });
});

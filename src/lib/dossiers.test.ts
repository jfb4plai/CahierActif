import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { amorcerDossiers, DOSSIERS_PAR_DEFAUT, verifierNomDossier } from './dossiers';
import { creerIndexedDBAdapter } from '../storage/indexeddb';

let n = 0;
const base = () => `dossiers-${n++}`;
const memoire = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};

describe('amorcerDossiers', () => {
  it('crée les cours par défaut, dans l’ordre', async () => {
    const a = creerIndexedDBAdapter(base());
    await amorcerDossiers(a, memoire());
    expect((await a.listerDossiers()).map(d => d.nom)).toEqual(DOSSIERS_PAR_DEFAUT);
  });
  it('deux amorçages simultanés ne créent pas de doublons', async () => {
    const a = creerIndexedDBAdapter(base());
    await Promise.all([amorcerDossiers(a, memoire()), amorcerDossiers(a, memoire())]);
    expect((await a.listerDossiers()).map(d => d.nom)).toEqual(DOSSIERS_PAR_DEFAUT);
  });
  it('une seule fois : un cours supprimé ne revient pas', async () => {
    const a = creerIndexedDBAdapter(base());
    const mem = memoire();
    await amorcerDossiers(a, mem);
    const [premier] = await a.listerDossiers();
    await a.supprimerDossier(premier.id);
    await amorcerDossiers(a, mem);
    expect((await a.listerDossiers()).map(d => d.nom)).not.toContain(premier.nom);
  });
  it('ne touche pas aux dossiers déjà présents', async () => {
    const a = creerIndexedDBAdapter(base());
    await a.enregistrerDossier({ id: 'x', nom: 'Latin', cree: 1 });
    await amorcerDossiers(a, memoire());
    expect((await a.listerDossiers()).map(d => d.nom)).toEqual(['Latin']);
  });
});

describe('verifierNomDossier', () => {
  const ex = [{ id: '1', nom: 'Français', cree: 1 }];
  it('nettoie les espaces', () => {
    expect(verifierNomDossier('  Travaux   pratiques ', ex)).toEqual({ nom: 'Travaux pratiques' });
  });
  it('refuse vide, trop long et doublon (casse comprise)', () => {
    expect(verifierNomDossier('   ', ex)).toHaveProperty('erreur');
    expect(verifierNomDossier('x'.repeat(41), ex)).toHaveProperty('erreur');
    expect(verifierNomDossier('français', ex)).toHaveProperty('erreur');
  });
  it('renommer en gardant son propre nom est permis', () => {
    expect(verifierNomDossier('Français', ex, '1')).toEqual({ nom: 'Français' });
  });
});

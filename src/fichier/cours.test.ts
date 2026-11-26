import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { depuisCours, typeDeFichier, versCours } from './cours';
import { versCahier } from './cahier';
import { ajouterObjet, nouveauDocPdf, nouveauDocPhotos, nouveauDocVierge } from '../model/ops';
import type { Trait } from '../model/types';

const trait: Trait = { id: 't', type: 'trait', points: [{ x: 1, y: 1 }, { x: 5, y: 5 }], couleur: '#dc2626', epaisseur: 0.8 };
const buf = async (b: Blob) => b.arrayBuffer();
const octets = (n: number[]) => new Uint8Array(n).buffer;

function jeu() {
  const vierge = ajouterObjet({ ...nouveauDocVierge('Dictée', 'p3p6') }, 0, trait);
  const pdf = nouveauDocPdf('Fiche PDF', 'p3p6', octets([37, 80, 68, 70, 1, 2, 3]), [{ largeurMm: 210, hauteurMm: 297 }]);
  const img = { mime: 'image/jpeg' as const, data: octets([9, 8, 7]) };
  const photos = nouveauDocPhotos('Feuille photo', 'p3p6', [img, img], [{ largeurMm: 210, hauteurMm: 297 }, { largeurMm: 297, hauteurMm: 210 }]);
  return [vierge, pdf, photos];
}

describe('fichier de cours (.cahiers)', () => {
  it('aller-retour : tous les documents, leur titre, leurs annotations, leurs sources', async () => {
    const [vierge, pdf, photos] = jeu();
    const fichier = await versCours({ nom: 'Français', couleur: 'bleu' }, [vierge, pdf, photos]);
    const recu = await depuisCours(await buf(fichier));
    expect(recu.nom).toBe('Français');
    expect(recu.couleur).toBe('bleu');
    expect(recu.documents.map(d => d.titre)).toEqual(['Dictée', 'Fiche PDF', 'Feuille photo']);
    expect(recu.documents[0].pages[0].objets).toHaveLength(1);
    const p = recu.documents[1].source;
    expect(p.type === 'pdf' && new Uint8Array(p.data)).toEqual(new Uint8Array([37, 80, 68, 70, 1, 2, 3]));
    const ph = recu.documents[2].source;
    expect(ph.type === 'photos' && ph.images).toHaveLength(2);
    expect(recu.documents[2].pages.map(x => x.largeurMm)).toEqual([210, 297]);
  });
  it('chaque document reçu a un nouvel identifiant (rien n’écrase un travail local)', async () => {
    const docs = jeu();
    const recu = await depuisCours(await buf(await versCours({ nom: 'X' }, docs)));
    for (const [i, d] of recu.documents.entries()) expect(d.id).not.toBe(docs[i].id);
  });
  it('sans couleur : pas de couleur', async () => {
    const recu = await depuisCours(await buf(await versCours({ nom: 'X' }, jeu())));
    expect(recu.couleur).toBeUndefined();
  });
  it('un cours vide ne s’exporte pas', async () => {
    await expect(versCours({ nom: 'X' }, [])).rejects.toThrow(RangeError);
  });
  it('typeDeFichier : cours, document, autre', async () => {
    const [vierge] = jeu();
    expect(await typeDeFichier(await buf(await versCours({ nom: 'X' }, [vierge])))).toBe('cours');
    expect(await typeDeFichier(await buf(await versCahier(vierge)))).toBe('document');
    expect(await typeDeFichier(octets([1, 2, 3]))).toBeNull();
    const zip = new JSZip();
    zip.file('autre.txt', 'x');
    expect(await typeDeFichier((await zip.generateAsync({ type: 'uint8array' })).buffer as ArrayBuffer)).toBeNull();
  });
  it('fichier qui n’est pas un cours : message clair', async () => {
    await expect(depuisCours(octets([1, 2, 3]))).rejects.toThrow('fichier de cours');
    const [vierge] = jeu();
    await expect(depuisCours(await buf(await versCahier(vierge)))).rejects.toThrow('fichier de cours');
  });
  it('version plus récente : demande de mettre à jour l’application', async () => {
    const zip = new JSZip();
    zip.file('manifeste.json', JSON.stringify({ format: 'cahieractif-cours', version: 99, cours: { nom: 'X' }, documents: ['a'] }));
    await expect(depuisCours((await zip.generateAsync({ type: 'uint8array' })).buffer as ArrayBuffer)).rejects.toThrow('plus récente');
  });
  it('manifeste qui cite un document absent : refusé', async () => {
    const zip = new JSZip();
    zip.file('manifeste.json', JSON.stringify({ format: 'cahieractif-cours', version: 1, cours: { nom: 'X' }, documents: ['documents/0.cahier'] }));
    await expect(depuisCours((await zip.generateAsync({ type: 'uint8array' })).buffer as ArrayBuffer)).rejects.toThrow('fichier de cours');
  });
});

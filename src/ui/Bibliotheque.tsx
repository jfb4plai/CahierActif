import { useEffect, useRef, useState } from 'react';
import { depuisCahier } from '../fichier/cahier';
import type { Reglages } from '../lib/reglages';
import { nouveauDocPdf, nouveauDocVierge } from '../model/ops';
import type { CahierDoc } from '../model/types';
import { taillesPagesPdf, PdfIllisibleError } from '../pdf/info';
import type { MetaDoc, StorageAdapter } from '../storage/adapter';

type Props = { stockage: StorageAdapter; reglages: Reglages; onOuvrir: (d: CahierDoc) => void };

export function Bibliotheque({ stockage, reglages, onOuvrir }: Props) {
  const [docs, setDocs] = useState<MetaDoc[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const pdfInput = useRef<HTMLInputElement>(null);
  const cahierInput = useRef<HTMLInputElement>(null);

  const rafraichir = () => stockage.lister().then(setDocs).catch(() => setErreur('Lecture des documents impossible sur cet appareil.'));
  useEffect(() => { void rafraichir(); }, []);

  const creerEtOuvrir = async (d: CahierDoc) => {
    await stockage.enregistrer(d);
    onOuvrir(d);
  };

  const ouvrirPdf = async (f: File) => {
    setErreur(null);
    try {
      const data = await f.arrayBuffer();
      const tailles = await taillesPagesPdf(data);
      await creerEtOuvrir(nouveauDocPdf(f.name.replace(/\.pdf$/i, ''), reglages.niveau, data, tailles));
    } catch (e) {
      setErreur(e instanceof PdfIllisibleError ? e.message : 'Ce fichier ne peut pas être ouvert.');
    }
  };

  const importerCahier = async (f: File) => {
    setErreur(null);
    try {
      await creerEtOuvrir(await depuisCahier(await f.arrayBuffer()));
    } catch (e) {
      setErreur((e as Error).message);
    }
  };

  const nouvellePageVierge = async () => {
    setErreur(null);
    try {
      await creerEtOuvrir(nouveauDocVierge('Page vierge', reglages.niveau));
    } catch {
      setErreur('Impossible de créer la page vierge (stockage plein ?). Libérez de la place et réessayez.');
    }
  };

  const ouvrirExistant = async (id: string) => {
    setErreur(null);
    try {
      const d = await stockage.charger(id);
      if (d) onOuvrir(d);
      else setErreur('Document introuvable.');
    } catch {
      setErreur('Ce document ne peut pas être ouvert sur cet appareil. Réessayez.');
    }
  };

  const supprimer = async (m: MetaDoc) => {
    if (!window.confirm(`Supprimer définitivement « ${m.titre} » de cet appareil ?`)) return;
    setErreur(null);
    try {
      await stockage.supprimer(m.id);
    } catch {
      setErreur(`La suppression de « ${m.titre} » a échoué. Réessayez.`);
    }
    await rafraichir();
  };

  return (
    <section className="plai-section mx-auto max-w-3xl p-4">
      <h1 className="mb-4 font-serif text-3xl">Mes documents</h1>
      <div className="mb-2 flex flex-wrap gap-2">
        <button type="button" className="plai-btn min-h-[44px]" onClick={() => pdfInput.current?.click()}>Ouvrir un PDF</button>
        <button type="button" className="plai-btn min-h-[44px]" onClick={nouvellePageVierge}>Nouvelle page vierge</button>
        <button type="button" className="plai-btn min-h-[44px]" onClick={() => cahierInput.current?.click()}>Reprendre un fichier .cahier</button>
      </div>
      <p className="mb-4 text-[var(--text2)]">
        Ouvrir un PDF : la fiche reçue de l’enseignant (Teams, Smartschool, mail). Fichier .cahier : un travail commencé sur un autre appareil.
        Tout reste sur cet appareil, rien n’est envoyé sur internet.
      </p>
      <input ref={pdfInput} type="file" accept="application/pdf" hidden onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void ouvrirPdf(f); }} />
      <input ref={cahierInput} type="file" accept=".cahier,application/zip" hidden onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void importerCahier(f); }} />
      {erreur && <div className="plai-error mb-4" role="alert">{erreur}</div>}
      {docs.length === 0 ? (
        <div className="plai-empty">Aucun document pour l’instant.</div>
      ) : (
        <ul className="space-y-2">
          {docs.map(m => (
            <li key={m.id} className="plai-card flex items-center gap-2 p-3">
              <button type="button" className="flex-1 text-left text-lg" onClick={() => ouvrirExistant(m.id)}>
                {m.titre}
                <span className="block text-base text-[var(--text3)]">Modifié le {new Date(m.modifie).toLocaleString('fr-BE')}</span>
              </button>
              <button type="button" className="plai-btn min-h-[44px]" onClick={() => supprimer(m)}>Supprimer</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

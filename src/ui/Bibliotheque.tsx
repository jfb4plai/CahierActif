import { useEffect, useRef, useState } from 'react';
import { depuisCahier } from '../fichier/cahier';
import { amorcerDossiers, NOM_MAX, verifierNomDossier } from '../lib/dossiers';
import type { Reglages } from '../lib/reglages';
import { PhotoIllisibleError, preparerPhotos } from '../lib/photo';
import { nouveauDocPdf, nouveauDocPhotos, nouveauDocVierge } from '../model/ops';
import { nouvelId } from '../model/types';
import type { CahierDoc, Dossier } from '../model/types';
import { taillesPagesPdf, PdfIllisibleError } from '../pdf/info';
import type { MetaDoc, StorageAdapter } from '../storage/adapter';

type Props = { stockage: StorageAdapter; reglages: Reglages; onOuvrir: (d: CahierDoc) => void };

// Filtre de la liste : tous les documents, ceux sans dossier, ou un dossier précis.
type Filtre = { type: 'tous' } | { type: 'aucun' } | { type: 'dossier'; id: string };
type FormulaireDossier = { mode: 'creer' } | { mode: 'renommer'; id: string };

export function Bibliotheque({ stockage, reglages, onOuvrir }: Props) {
  const [docs, setDocs] = useState<MetaDoc[]>([]);
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [filtre, setFiltre] = useState<Filtre>({ type: 'tous' });
  const [formulaire, setFormulaire] = useState<FormulaireDossier | null>(null);
  const [nomSaisi, setNomSaisi] = useState('');
  const [erreurNom, setErreurNom] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const pdfInput = useRef<HTMLInputElement>(null);
  const cahierInput = useRef<HTMLInputElement>(null);
  const photosInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);

  const rafraichir = () =>
    Promise.all([stockage.lister(), stockage.listerDossiers()])
      .then(([m, d]) => { setDocs(m); setDossiers(d); })
      .catch(() => setErreur('Lecture des documents impossible sur cet appareil.'));
  useEffect(() => { void amorcerDossiers(stockage).catch(() => undefined).then(rafraichir); }, []);

  const dossierActif = filtre.type === 'dossier' ? dossiers.find(d => d.id === filtre.id) : undefined;

  // Un document créé ou importé pendant qu'un dossier est ouvert est rangé dedans.
  const creerEtOuvrir = async (d: CahierDoc) => {
    await stockage.enregistrer(d);
    if (dossierActif) await stockage.deplacer(d.id, dossierActif.id);
    onOuvrir(d);
  };

  const ouvrirFormulaire = (f: FormulaireDossier) => {
    setFormulaire(f);
    setNomSaisi(f.mode === 'renommer' ? (dossiers.find(d => d.id === f.id)?.nom ?? '') : '');
    setErreurNom(null);
  };

  const validerFormulaire = async () => {
    if (!formulaire) return;
    const ignorer = formulaire.mode === 'renommer' ? formulaire.id : undefined;
    const r = verifierNomDossier(nomSaisi, dossiers, ignorer);
    if ('erreur' in r) { setErreurNom(r.erreur); return; }
    try {
      if (formulaire.mode === 'renommer') {
        const d = dossiers.find(x => x.id === formulaire.id);
        if (d) await stockage.enregistrerDossier({ ...d, nom: r.nom });
      } else {
        const d: Dossier = { id: nouvelId(), nom: r.nom, cree: Date.now() };
        await stockage.enregistrerDossier(d);
        setFiltre({ type: 'dossier', id: d.id });
      }
      setFormulaire(null);
      await rafraichir();
    } catch {
      setErreurNom('Le dossier n’a pas pu être enregistré. Réessayer.');
    }
  };

  const supprimerDossier = async (d: Dossier) => {
    const n = docs.filter(m => m.dossierId === d.id).length;
    const suite = n === 0 ? '' : n === 1
      ? ' Son document ne sera pas supprimé : il ira dans « Sans dossier ».'
      : ` Ses ${n} documents ne seront pas supprimés : ils iront dans « Sans dossier ».`;
    if (!window.confirm(`Supprimer le dossier « ${d.nom} » ?${suite}`)) return;
    try {
      await stockage.supprimerDossier(d.id);
    } catch {
      setErreur(`La suppression du dossier « ${d.nom} » a échoué. Réessayer.`);
    }
    setFiltre({ type: 'tous' });
    await rafraichir();
  };

  const ranger = async (m: MetaDoc, dossierId: string) => {
    setErreur(null);
    try {
      await stockage.deplacer(m.id, dossierId || null);
    } catch {
      setErreur(`« ${m.titre} » n’a pas pu être rangé. Réessayer.`);
    }
    await rafraichir();
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

  // Une ou plusieurs photos de feuilles : une page par photo, annotables comme un PDF.
  const importerPhotos = async (fichiers: File[]) => {
    setErreur(null);
    if (fichiers.length === 0) return;
    try {
      const { images, tailles } = await preparerPhotos(fichiers);
      const titre = images.length === 1 ? 'Feuille photographiée' : `Feuilles photographiées (${images.length})`;
      await creerEtOuvrir(nouveauDocPhotos(titre, reglages.niveau, images, tailles));
    } catch (e) {
      setErreur(e instanceof PhotoIllisibleError ? e.message : 'Les photos n’ont pas pu être enregistrées (stockage plein ?). Libérer de la place et réessayer.');
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

  const rangeDansUnDossier = (m: MetaDoc) => !!m.dossierId && dossiers.some(d => d.id === m.dossierId);
  const nbSans = docs.filter(m => !rangeDansUnDossier(m)).length;
  const visibles = docs.filter(m => {
    if (filtre.type === 'tous') return true;
    return filtre.type === 'aucun' ? !rangeDansUnDossier(m) : m.dossierId === filtre.id;
  });
  const puce = (actif: boolean) =>
    `min-h-[44px] rounded-full border px-4 text-base ${actif ? 'border-[#0f6e56] bg-[#0f6e56] text-white' : 'border-[var(--border)] bg-white text-[var(--text)]'}`;
  const titre = filtre.type === 'dossier' ? (dossierActif?.nom ?? 'Mes documents') : filtre.type === 'aucun' ? 'Sans dossier' : 'Mes documents';

  return (
    <>
      <nav className="border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3" aria-label="Mes dossiers (cours)">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2">
          <span className="font-serif text-lg">Mes cours</span>
          <button type="button" className={puce(filtre.type === 'tous')} aria-pressed={filtre.type === 'tous'} onClick={() => setFiltre({ type: 'tous' })}>
            Tous ({docs.length})
          </button>
          {dossiers.map(d => {
            const actif = filtre.type === 'dossier' && filtre.id === d.id;
            return (
              <button key={d.id} type="button" className={puce(actif)} aria-pressed={actif} onClick={() => setFiltre({ type: 'dossier', id: d.id })}>
                {d.nom} ({docs.filter(m => m.dossierId === d.id).length})
              </button>
            );
          })}
          <button type="button" className={puce(filtre.type === 'aucun')} aria-pressed={filtre.type === 'aucun'} onClick={() => setFiltre({ type: 'aucun' })}>
            Sans dossier ({nbSans})
          </button>
          <button type="button" className="plai-btn min-h-[44px]" onClick={() => ouvrirFormulaire({ mode: 'creer' })}>+ Nouveau dossier</button>
        </div>
        {dossierActif && !formulaire && (
          <div className="mx-auto mt-2 flex max-w-3xl flex-wrap items-center gap-2">
            <span className="text-base text-[var(--text2)]">Dossier « {dossierActif.nom} » :</span>
            <button type="button" className="plai-btn min-h-[44px]" onClick={() => ouvrirFormulaire({ mode: 'renommer', id: dossierActif.id })}>Renommer</button>
            <button type="button" className="plai-btn min-h-[44px]" onClick={() => supprimerDossier(dossierActif)}>Supprimer ce dossier</button>
          </div>
        )}
        {formulaire && (
          <form className="mx-auto mt-3 max-w-3xl" onSubmit={e => { e.preventDefault(); void validerFormulaire(); }}>
            <label htmlFor="nom-dossier" className="block text-base font-semibold">
              {formulaire.mode === 'creer' ? 'Nom du nouveau dossier' : 'Nouveau nom du dossier'}
            </label>
            <input
              id="nom-dossier"
              className="plai-input mt-1 min-h-[44px] w-full max-w-sm text-base"
              value={nomSaisi}
              maxLength={NOM_MAX}
              placeholder="Ex. : Néerlandais, Travaux de sciences"
              aria-describedby="aide-nom-dossier"
              autoFocus
              onChange={e => { setNomSaisi(e.target.value); setErreurNom(null); }}
            />
            <p id="aide-nom-dossier" className="mt-1 text-base text-[var(--text2)]">
              Un dossier regroupe les documents d’un même cours. Son nom apparaît dans la liste des cours ; il pourra être changé plus tard.
            </p>
            {erreurNom && <p className="plai-error mt-1" role="alert">{erreurNom}</p>}
            <div className="mt-2 flex gap-2">
              <button type="submit" className="plai-btn min-h-[44px]">{formulaire.mode === 'creer' ? 'Créer le dossier' : 'Enregistrer'}</button>
              <button type="button" className="plai-btn min-h-[44px]" onClick={() => setFormulaire(null)}>Annuler</button>
            </div>
          </form>
        )}
      </nav>
      <section className="plai-section mx-auto max-w-3xl p-4">
        <h1 className="mb-4 font-serif text-3xl">{titre}</h1>
        <div className="mb-2 flex flex-wrap gap-2">
          <button type="button" className="plai-btn min-h-[44px]" onClick={() => pdfInput.current?.click()}>Ouvrir un PDF</button>
          <button type="button" className="plai-btn min-h-[44px]" onClick={() => cameraInput.current?.click()}>Photographier une feuille</button>
          <button type="button" className="plai-btn min-h-[44px]" onClick={() => photosInput.current?.click()}>Choisir des photos de feuilles</button>
          <button type="button" className="plai-btn min-h-[44px]" onClick={nouvellePageVierge}>Nouvelle page vierge</button>
          <button type="button" className="plai-btn min-h-[44px]" onClick={() => cahierInput.current?.click()}>Reprendre un fichier .cahier</button>
        </div>
        <p className="mb-4 text-[var(--text2)]">
          Ouvrir un PDF : la fiche reçue de l’enseignant (Teams, Smartschool, mail). Photographier ou choisir des photos : une feuille papier devient une page à annoter. Fichier .cahier : un travail commencé sur un autre appareil.
          Tout reste sur cet appareil, rien n’est envoyé sur internet.
        </p>
        <input ref={pdfInput} type="file" accept="application/pdf" hidden onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void ouvrirPdf(f); }} />
        <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={e => { const f = Array.from(e.target.files ?? []); e.target.value = ''; void importerPhotos(f); }} />
        <input ref={photosInput} type="file" accept="image/*" multiple hidden onChange={e => { const f = Array.from(e.target.files ?? []); e.target.value = ''; void importerPhotos(f); }} />
        <input ref={cahierInput} type="file" accept=".cahier,application/zip" hidden onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void importerCahier(f); }} />
        {erreur && <div className="plai-error mb-4" role="alert">{erreur}</div>}
        {visibles.length === 0 ? (
          <div className="plai-empty">
            {docs.length === 0
              ? 'Aucun document pour l’instant.'
              : dossierActif
                ? `Aucun document dans « ${dossierActif.nom} ». Ouvrir un PDF ici le range dans ce dossier.`
                : 'Aucun document ici.'}
          </div>
        ) : (
          <ul className="space-y-2">
            {visibles.map(m => (
              <li key={m.id} className="plai-card flex flex-wrap items-center gap-2 p-3">
                <button type="button" className="min-w-[12rem] flex-1 text-left text-lg" onClick={() => ouvrirExistant(m.id)}>
                  {m.titre}
                  <span className="block text-base text-[var(--text3)]">Modifié le {new Date(m.modifie).toLocaleString('fr-BE')}</span>
                </button>
                <label className="flex items-center gap-2 text-base">
                  Ranger dans
                  <select
                    className="plai-input min-h-[44px]"
                    value={rangeDansUnDossier(m) ? m.dossierId : ''}
                    onChange={e => void ranger(m, e.target.value)}
                  >
                    <option value="">Sans dossier</option>
                    {dossiers.map(d => <option key={d.id} value={d.id}>{d.nom}</option>)}
                  </select>
                </label>
                <button type="button" className="plai-btn min-h-[44px]" onClick={() => supprimer(m)}>Supprimer</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

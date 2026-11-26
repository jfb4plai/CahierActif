import { useContext, useEffect, useRef, useState, type CSSProperties } from 'react';
import { depuisCahier } from '../fichier/cahier';
import { EXTENSION_COURS, typeDeFichier } from '../fichier/cours';
import { importerCours, preparerEnvoi } from '../lib/coursEnvoi';
import { nomFichier, partagerOuTelecharger } from '../lib/partage';
import { amorcerDossiers, NOM_MAX, verifierNomDossier } from '../lib/dossiers';
import { couleurCours, PALETTE_COURS, premiereCouleurLibre, SANS_COULEUR } from '../lib/couleursCours';
import { amorcerExemple } from '../lib/exemple';
import type { Reglages } from '../lib/reglages';
import { TITRE_MAX, titreParDefaut, verifierTitre } from '../lib/titres';
import { PhotoIllisibleError, preparerPhotos } from '../lib/photo';
import type { PhotoPrete } from '../lib/fileRecadrage';
import { RecadrerPhotos } from './RecadrerPhotos';
import { nouveauDocPdf, nouveauDocPhotos, nouveauDocVierge } from '../model/ops';
import { nouvelId } from '../model/types';
import type { CahierDoc, Dossier } from '../model/types';
import { taillesPagesPdf, PdfIllisibleError } from '../pdf/info';
import type { MetaDoc, StorageAdapter } from '../storage/adapter';
import { VerrouContexte } from './DialogueCode';
import { IconeCamera, IconeDossier, IconePage, IconePdf, IconePhotos } from './icones';

type Props = { stockage: StorageAdapter; reglages: Reglages; onOuvrir: (d: CahierDoc) => void };

// Filtre de la liste : tous les documents, ceux sans dossier, ou un dossier précis.
type Filtre = { type: 'tous' } | { type: 'aucun' } | { type: 'dossier'; id: string };
type FormulaireDossier = { mode: 'creer' } | { mode: 'renommer'; id: string };

export function Bibliotheque({ stockage, reglages, onOuvrir }: Props) {
  const verrou = useContext(VerrouContexte);
  const [docs, setDocs] = useState<MetaDoc[]>([]);
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [filtre, setFiltre] = useState<Filtre>({ type: 'tous' });
  const [formulaire, setFormulaire] = useState<FormulaireDossier | null>(null);
  const [nomSaisi, setNomSaisi] = useState('');
  const [couleurSaisie, setCouleurSaisie] = useState<string>(SANS_COULEUR);
  const [erreurNom, setErreurNom] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [renommage, setRenommage] = useState<{ id: string; valeur: string; erreur: string | null } | null>(null);
  const pdfInput = useRef<HTMLInputElement>(null);
  const cahierInput = useRef<HTMLInputElement>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [aRecadrer, setARecadrer] = useState<PhotoPrete[] | null>(null);
  const photosInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);

  const rafraichir = () =>
    Promise.all([stockage.lister(), stockage.listerDossiers()])
      .then(([m, d]) => { setDocs(m); setDossiers(d); })
      .catch(() => setErreur('Lecture des documents impossible sur cet appareil.'));
  useEffect(() => { void amorcerDossiers(stockage).catch(() => undefined).then(() => amorcerExemple(stockage)).catch(() => undefined).then(rafraichir); }, []);

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
    // Renommer : la couleur actuelle ; créer : une couleur qu'aucun cours n'utilise encore, pour qu'il se distingue des autres.
    setCouleurSaisie(f.mode === 'renommer' ? (couleurCours(dossiers.find(d => d.id === f.id))?.id ?? SANS_COULEUR) : premiereCouleurLibre(dossiers));
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
        if (d) await stockage.enregistrerDossier({ ...d, nom: r.nom, couleur: couleurSaisie });
      } else {
        const d: Dossier = { id: nouvelId(), nom: r.nom, cree: Date.now(), couleur: couleurSaisie };
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
    if (!(await verrou.demander())) return;
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

  // Une ou plusieurs photos de feuilles : chaque photo passe par l'écran de recadrage (coins détectés), puis une page par photo.
  const importerPhotos = async (fichiers: File[]) => {
    setErreur(null);
    if (fichiers.length === 0) return;
    try {
      const { images, tailles } = await preparerPhotos(fichiers);
      setARecadrer(images.map((image, i) => ({ image, taille: tailles[i] })));
    } catch (e) {
      setErreur(e instanceof PhotoIllisibleError ? e.message : 'Les photos n’ont pas pu être lues. Réessayer.');
    }
  };

  const creerDepuisPhotos = async (photos: PhotoPrete[]) => {
    setARecadrer(null);
    try {
      const titre = titreParDefaut(photos.length === 1 ? 'Feuille photographiée' : `Feuilles photographiées (${photos.length})`);
      await creerEtOuvrir(nouveauDocPhotos(titre, reglages.niveau, photos.map(p => p.image), photos.map(p => p.taille)));
    } catch {
      setErreur('Les photos n’ont pas pu être enregistrées (stockage plein ?). Libérer de la place et réessayer.');
    }
  };

  // Un fichier .cahier est un document ; un fichier .cahiers est un cours entier (nom, couleur et tous ses documents).
  const importerCahier = async (f: File) => {
    setErreur(null);
    setInfo(null);
    try {
      const data = await f.arrayBuffer();
      if ((await typeDeFichier(data)) === 'cours') {
        const r = await importerCours(stockage, data, dossiers);
        await rafraichir();
        setFiltre({ type: 'dossier', id: r.dossier.id });
        setInfo('Cours « ' + r.dossier.nom + ' » reçu : ' + r.nombre + (r.nombre > 1 ? ' documents rangés' : ' document rangé') + (r.cree ? ' dans un nouveau cours.' : ' dans le cours qui porte déjà ce nom.'));
        return;
      }
      await creerEtOuvrir(await depuisCahier(data));
    } catch (e) {
      setErreur((e as Error).message);
    }
  };

  // Tous les documents du cours dans un seul fichier, à ouvrir sur l'autre appareil avec « Reprendre un fichier ».
  const envoyerCours = async (cours: Dossier) => {
    setErreur(null);
    setInfo(null);
    setEnvoiEnCours(true);
    try {
      const envoi = await preparerEnvoi(stockage, cours);
      if (!envoi) {
        setErreur('Le cours « ' + cours.nom + ' » ne contient aucun document à envoyer.');
        return;
      }
      await partagerOuTelecharger(envoi.fichier, nomFichier(cours.nom) + EXTENSION_COURS);
      setInfo('Le cours « ' + cours.nom + ' » est prêt : ' + envoi.nombre + (envoi.nombre > 1 ? ' documents' : ' document') + ' dans un seul fichier.');
    } catch {
      setErreur('Le cours n’a pas pu être préparé (mémoire insuffisante ?). Essayer avec moins de documents.');
    } finally {
      setEnvoiEnCours(false);
    }
  };

  const nouvellePageVierge = async () => {
    setErreur(null);
    try {
      await creerEtOuvrir(nouveauDocVierge(titreParDefaut('Page vierge'), reglages.niveau));
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

  const validerRenommage = async () => {
    if (!renommage) return;
    const r = verifierTitre(renommage.valeur);
    if ('erreur' in r) { setRenommage({ ...renommage, erreur: r.erreur }); return; }
    try {
      await stockage.renommer(renommage.id, r.titre);
      setRenommage(null);
      await rafraichir();
    } catch {
      setRenommage({ ...renommage, erreur: 'Le nom n’a pas pu être enregistré. Réessayer.' });
    }
  };

  const supprimer = async (m: MetaDoc) => {
    if (!(await verrou.demander())) return;
    if (!window.confirm(`Supprimer définitivement « ${m.titre} » de cet appareil ?`)) return;
    setErreur(null);
    try {
      await stockage.supprimer(m.id);
    } catch {
      setErreur(`La suppression de « ${m.titre} » a échoué. Réessayez.`);
    }
    await rafraichir();
  };

  // Liseré gauche d'une ligne de document : la couleur de son cours (rien pour un document sans cours).
  const liseres = (m: MetaDoc): CSSProperties | undefined => {
    const c = couleurCours(dossiers.find(d => d.id === m.dossierId));
    return c ? { borderLeft: `8px solid ${c.bord}` } : undefined;
  };
  const rangeDansUnDossier = (m: MetaDoc) => !!m.dossierId && dossiers.some(d => d.id === m.dossierId);
  const nbSans = docs.filter(m => !rangeDansUnDossier(m)).length;
  const visibles = docs.filter(m => {
    if (filtre.type === 'tous') return true;
    return filtre.type === 'aucun' ? !rangeDansUnDossier(m) : m.dossierId === filtre.id;
  });
  const titre = filtre.type === 'dossier' ? (dossierActif?.nom ?? 'Mes documents') : filtre.type === 'aucun' ? 'Sans dossier' : 'Mes documents';

  // Un cours ouvert montre d'abord ses documents (c'est ce qu'on cherche), puis les boutons pour en ajouter.
  const titreListe = filtre.type === 'tous' ? 'Mes documents' : `Documents (${visibles.length})`;
  const blocCartes = (
    <>
          <p className="chapo mt-2">
            Ouvrir la fiche reçue de l’enseignant (Teams, Smartschool, mail), photographier une feuille papier ou écrire sur une page vierge.
            {dossierActif ? ' Le document créé ici est rangé dans « ' + dossierActif.nom + ' ».' : ''}
          </p>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <button type="button" className="carte-action orange" onClick={() => pdfInput.current?.click()}>
              <IconePdf />
              <span className="titre">Ouvrir un PDF</span>
              <span className="texte">La fiche reçue de l’enseignant.</span>
              <span className="appel">Choisir un PDF →</span>
            </button>
            <button type="button" className="carte-action indigo" onClick={() => cameraInput.current?.click()}>
              <IconeCamera />
              <span className="titre">Photographier une feuille</span>
              <span className="texte">Une feuille papier devient une page à annoter.</span>
              <span className="appel">Ouvrir l’appareil photo →</span>
            </button>
            <button type="button" className="carte-action indigo" onClick={() => photosInput.current?.click()}>
              <IconePhotos />
              <span className="titre">Choisir des photos</span>
              <span className="texte">Plusieurs feuilles d’un coup : une page par photo.</span>
              <span className="appel">Choisir des photos →</span>
            </button>
            <button type="button" className="carte-action teal" onClick={nouvellePageVierge}>
              <IconePage />
              <span className="titre">Nouvelle page vierge</span>
              <span className="texte">Écrire sur une page blanche, avec ou sans quadrillage.</span>
              <span className="appel">Créer une page →</span>
            </button>
            <button type="button" className="carte-action neutre" onClick={() => cahierInput.current?.click()}>
              <IconeDossier />
              <span className="titre">Reprendre un fichier</span>
              <span className="texte">Un document (.cahier) ou un cours entier (.cahiers) venu d’un autre appareil.</span>
              <span className="appel">Choisir un fichier →</span>
            </button>
          </div>
          {aRecadrer && <RecadrerPhotos photos={aRecadrer} onTermine={p => void creerDepuisPhotos(p)} onAnnuler={() => setARecadrer(null)} />}
          <input ref={pdfInput} type="file" accept="application/pdf" hidden onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void ouvrirPdf(f); }} />
          <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={e => { const f = Array.from(e.target.files ?? []); e.target.value = ''; void importerPhotos(f); }} />
          <input ref={photosInput} type="file" accept="image/*" multiple hidden onChange={e => { const f = Array.from(e.target.files ?? []); e.target.value = ''; void importerPhotos(f); }} />
          <input ref={cahierInput} type="file" accept=".cahier,.cahiers,application/zip" hidden onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void importerCahier(f); }} />

          {erreur && <div className="plai-error mt-4" role="alert">{erreur}</div>}
          {info && (
            <div className="plai-banner mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl" role="status">
              <span>{info}</span>
              <button type="button" className="plai-btn-secondaire min-h-[44px]" onClick={() => setInfo(null)}>Fermer</button>
            </div>
          )}

    </>
  );
  const blocDocuments = (
    <>
          <h2 className="titre-section mb-3 mt-6">{titreListe}</h2>
          {visibles.length === 0 ? (
            <div className="plai-empty">
              {docs.length === 0
                ? 'Aucun document pour l’instant.'
                : dossierActif
                  ? 'Aucun document dans « ' + dossierActif.nom + ' ». Ouvrir un PDF ici le range dans ce dossier.'
                  : 'Aucun document ici.'}
            </div>
          ) : (
            <ul className="space-y-2">
              {visibles.map(m => (
                <li key={m.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[14px] sm:flex-nowrap border border-[var(--border)] bg-[var(--carte-douce)] p-2" style={liseres(m)}>
                  {renommage?.id === m.id ? (
                    <form className="flex min-w-[12rem] flex-1 flex-wrap items-center gap-2" onSubmit={e => { e.preventDefault(); void validerRenommage(); }}>
                      <label className="flex min-w-[12rem] flex-1 flex-col text-base font-semibold">
                        Nom du document
                        <input
                          className="plai-input min-h-[44px] font-normal" autoFocus maxLength={TITRE_MAX + 10} value={renommage.valeur}
                          aria-invalid={!!renommage.erreur} aria-describedby={renommage.erreur ? 'erreur-renommage' : undefined}
                          onChange={e => setRenommage({ ...renommage, valeur: e.target.value, erreur: null })}
                          onKeyDown={e => { if (e.key === 'Escape') setRenommage(null); }}
                        />
                        {renommage.erreur && <span id="erreur-renommage" role="alert" className="text-base font-normal text-[#b91c1c]">{renommage.erreur}</span>}
                      </label>
                      <button type="submit" className="plai-btn min-h-[44px]">Enregistrer</button>
                      <button type="button" className="plai-btn-secondaire min-h-[44px]" onClick={() => setRenommage(null)}>Annuler</button>
                    </form>
                  ) : (
                    <button type="button" className="flex min-w-[10rem] flex-1 items-center gap-3 text-left text-lg font-semibold leading-snug sm:min-w-0" onClick={() => ouvrirExistant(m.id)}>
                      {m.miniature
                        ? <img src={m.miniature} alt="" className="h-[64px] w-auto shrink-0 rounded border border-[var(--border)] bg-white" />
                        : <span aria-hidden className="flex h-[64px] w-[46px] shrink-0 items-center justify-center rounded border border-[var(--border)] bg-white text-[var(--text3)]"><IconePage /></span>}
                      <span className="min-w-0">
                        <span className="line-clamp-2 break-words" title={m.titre}>{m.titre}</span>
                        <span className="block whitespace-nowrap text-base font-normal text-[var(--text3)]"
                          title={`Modifié le ${new Date(m.modifie).toLocaleString('fr-BE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`}>
                          {new Date(m.modifie).toLocaleDateString('fr-BE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </span>
                      </span>
                    </button>
                  )}
                  {renommage?.id !== m.id && (
                    <div className="flex flex-wrap items-end gap-2 sm:shrink-0 sm:flex-nowrap">
                      <button type="button" className="plai-btn min-h-[44px] !px-3" aria-label={`Ouvrir ${m.titre}`} onClick={() => ouvrirExistant(m.id)}>Ouvrir</button>
                      <button type="button" className="plai-btn-secondaire min-h-[44px] !px-3" onClick={() => setRenommage({ id: m.id, valeur: m.titre, erreur: null })}>Renommer</button>
                      <label className="flex flex-col text-base leading-tight">
                        Ranger dans
                        <select
                          className="plai-input mt-0.5 min-h-[44px] w-[8.5rem]"
                          value={rangeDansUnDossier(m) ? m.dossierId : ''}
                          onChange={e => void ranger(m, e.target.value)}
                        >
                          <option value="">Sans dossier</option>
                          {dossiers.map(d => <option key={d.id} value={d.id}>{d.nom}</option>)}
                        </select>
                      </label>
                      <button type="button" className="plai-btn-secondaire plai-btn-danger min-h-[44px] !px-3" onClick={() => supprimer(m)}>Supprimer</button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
    </>
  );

  return (
    <>
      <nav className="px-4 pb-1 pt-2" aria-label="Mes dossiers (cours)">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-2">
          <span className="mr-1 text-lg font-bold">Mes cours</span>
          <button type="button" className="puce-cours" aria-pressed={filtre.type === 'tous'} onClick={() => setFiltre({ type: 'tous' })}>
            Tous ({docs.length})
          </button>
          {dossiers.map(d => {
            const actif = filtre.type === 'dossier' && filtre.id === d.id;
            const c = couleurCours(d);
            const style = c ? ({ '--cours-fond': c.fond, '--cours-bord': c.bord } as CSSProperties) : undefined;
            return (
              <button key={d.id} type="button" className="puce-cours" style={style} aria-pressed={actif} onClick={() => setFiltre({ type: 'dossier', id: d.id })}>
                {actif && c && <span aria-hidden className="mr-2 inline-block h-3 w-3 rounded-full align-middle" style={{ background: c.fond, border: `2px solid ${c.bord}` }} />}
                {d.nom} ({docs.filter(m => m.dossierId === d.id).length})
              </button>
            );
          })}
          <button type="button" className="puce-cours" aria-pressed={filtre.type === 'aucun'} onClick={() => setFiltre({ type: 'aucun' })}>
            Sans dossier ({nbSans})
          </button>
          <button type="button" className="plai-btn-secondaire min-h-[44px]" onClick={() => ouvrirFormulaire({ mode: 'creer' })}>+ Nouveau dossier</button>
        </div>
        {dossierActif && !formulaire && (
          <div className="mx-auto mt-2 flex max-w-4xl flex-wrap items-center gap-2">
            <span className="text-base text-[var(--text2)]">Dossier « {dossierActif.nom} » :</span>
            <button type="button" className="plai-btn-secondaire min-h-[44px]" disabled={envoiEnCours} onClick={() => void envoyerCours(dossierActif)}>
              {envoiEnCours ? 'Préparation…' : 'Envoyer ce cours'}
            </button>
            <button type="button" className="plai-btn-secondaire min-h-[44px]" onClick={() => ouvrirFormulaire({ mode: 'renommer', id: dossierActif.id })}>Renommer</button>
            <button type="button" className="plai-btn-secondaire plai-btn-danger min-h-[44px]" onClick={() => supprimerDossier(dossierActif)}>Supprimer ce dossier</button>
            <p className="w-full text-base text-[var(--text2)]">
              « Envoyer ce cours » met tous ses documents dans un seul fichier (.cahiers). Sur l’autre appareil : « Reprendre un fichier ».
            </p>
          </div>
        )}
        {formulaire && (
          <form className="carte-flottante mx-auto mt-3 max-w-4xl p-4" onSubmit={e => { e.preventDefault(); void validerFormulaire(); }}>
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
            <fieldset className="mt-3">
              <legend className="text-base font-semibold">Couleur du cours</legend>
              <p className="text-base text-[var(--text2)]">Une couleur de plus pour reconnaître le cours. Son nom reste toujours écrit.</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {[{ id: SANS_COULEUR, nom: 'Aucune', fond: '#ffffff', bord: '#9ca3af' }, ...PALETTE_COURS].map(c => (
                  <label key={c.id} className="cursor-pointer">
                    <input type="radio" name="couleur-cours" value={c.id} className="peer sr-only" checked={couleurSaisie === c.id} onChange={() => setCouleurSaisie(c.id)} />
                    <span
                      className="flex min-h-[44px] items-center gap-2 rounded-full border-2 px-3 text-base peer-checked:font-bold peer-checked:ring-2 peer-checked:ring-[#1a1814] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-[#1d4ed8]"
                      style={{ background: c.fond, borderColor: c.bord }}
                    >
                      {couleurSaisie === c.id && <span aria-hidden>✓</span>}
                      {c.nom}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            {erreurNom && <p className="plai-error mt-1" role="alert">{erreurNom}</p>}
            <div className="mt-2 flex gap-2">
              <button type="submit" className="plai-btn min-h-[44px]">{formulaire.mode === 'creer' ? 'Créer le dossier' : 'Enregistrer'}</button>
              <button type="button" className="plai-btn-secondaire min-h-[44px]" onClick={() => setFormulaire(null)}>Annuler</button>
            </div>
          </form>
        )}
      </nav>

      <section className="mx-auto max-w-4xl px-4 pb-10 pt-3">
        <div className="carte-accueil">
          <p className="pastille">Gratuit · Sans compte · Tout reste sur cet appareil</p>
          <h1 className="titre-accueil mt-3">
            {filtre.type === 'tous' ? (
              <>Annoter une fiche <span className="accent">comme sur un cahier</span></>
            ) : titre}
          </h1>
          {filtre.type === 'tous' ? (
            <>
              {blocCartes}
              {blocDocuments}
            </>
          ) : (
            <>
              {blocDocuments}
              <h2 className="titre-section mb-1 mt-8">{dossierActif ? `Ajouter un document dans « ${dossierActif.nom} »` : 'Ajouter un document'}</h2>
              {blocCartes}
            </>
          )}
        </div>
      </section>
    </>
  );
}

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { ETAT_INITIAL, type EtatStylet } from '../input/pointerPolicy';
import { nomFichier, partagerOuTelecharger } from '../lib/partage';
import { pxParMm, zoomAjuste } from '../lib/units';
import type { Reglages } from '../lib/reglages';
import { versCahier } from '../fichier/cahier';
import { annuler, creer, peutAnnuler, peutRetablir, pousser, retablir, type Historique } from '../model/history';
import { COULEURS_SURLIGNEUR, SURLIGNEUR_EPAISSEUR_MM } from '../lib/couleurs';
import { TAILLE_TEXTE_DEFAUT_PT } from '../model/texte';
import { PhotoIllisibleError, preparerPhotos } from '../lib/photo';
import { ajouterPageVierge, ajouterPagesPhotos, changerFond, deplacerPage, remplacerPhoto, degrouperObjets, epaissirObjets, grouperObjets, recolorerObjets, redimensionnerTextes, supprimerObjets } from '../model/ops';
import type { OutilId } from '../model/outils';
import type { CahierDoc, Fond, TypeForme } from '../model/types';
import { aDesPagesTournees } from '../pdf/info';
import { exporterPdf } from '../pdf/export';
import { ouvrirPdf, type PDFDocumentProxy } from '../pdf/pdfjs';
import type { StorageAdapter } from '../storage/adapter';
import { BarreOutils, COULEURS, EPAISSEURS, type PropsOutils } from './BarreOutils';
import { BandeauReglages, BarreBas } from './BandeauReglages';
import { LARGEUR_COLONNE_PX } from './ColonneOutils';
import { ColonneRepliable, LARGEUR_BANDE_PX } from './ColonneRepliable';
import { usePeek } from './usePeek';
import { IconeUi } from './iconesOutils';
import { ecrireInterface, lireInterface } from '../lib/interface';
import { GestionPages } from './GestionPages';
import { extraireDocument } from '../pdf/extraire';
import { FONDS } from '../model/fonds';
import { PageVue } from './PageVue';

type Action = { type: 'commit'; doc: CahierDoc } | { type: 'annuler' } | { type: 'retablir' };

function reducteur(h: Historique<CahierDoc>, a: Action): Historique<CahierDoc> {
  if (a.type === 'commit') return pousser(h, a.doc);
  return a.type === 'annuler' ? annuler(h) : retablir(h);
}

type Props = { initial: CahierDoc; reglages: Reglages; stockage: StorageAdapter; onFermer: () => void };

export function Editeur({ initial, reglages, stockage, onFermer }: Props) {
  const [h, dispatch] = useReducer(reducteur, initial, creer);
  const doc = h.present;
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  // Document de photos : une URL locale par photo pour l'afficher sous les annotations.
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const imagesPhotos = doc.source.type === 'photos' ? doc.source.images : null;
  useEffect(() => {
    if (!imagesPhotos) { setPhotoUrls([]); return; }
    const urls = imagesPhotos.map(i => URL.createObjectURL(new Blob([i.data], { type: i.mime })));
    setPhotoUrls(urls);
    return () => urls.forEach(u => URL.revokeObjectURL(u));
  }, [imagesPhotos]);
  const [pagesOuvert, setPagesOuvert] = useState(false);
  const photosInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const [outil, setOutil] = useState<OutilId>('stylo');
  const [couleurEncre, setCouleurEncre] = useState(COULEURS[0].hex);
  const [couleurSurligneur, setCouleurSurligneur] = useState(COULEURS_SURLIGNEUR[0].hex);
  const [epaisseurEncre, setEpaisseurEncre] = useState(EPAISSEURS[1].mm);
  const [formeChoisie, setFormeChoisie] = useState<TypeForme>('rectangle');
  const [selection, setSelection] = useState<{ page: number; ids: string[] } | null>(null);
  const [choixMultiple, setChoixMultiple] = useState(false);
  const [ordreModifier, setOrdreModifier] = useState(0);
  const [modeSurligneur, setModeSurligneur] = useState<'libre' | 'lineaire'>('libre');
  const [epaisseurSurligneur, setEpaisseurSurligneur] = useState(SURLIGNEUR_EPAISSEUR_MM);
  const [taillePtTexte, setTaillePtTexte] = useState(TAILLE_TEXTE_DEFAUT_PT);
  const surligneur = outil === 'surligneur';
  // Le surligneur a sa palette et son épaisseur fixes ; les autres outils partagent l'encre.
  const couleur = surligneur ? couleurSurligneur : couleurEncre;
  const epaisseur = surligneur ? epaisseurSurligneur : epaisseurEncre;
  // P3 et plus : colonne d'outils à côté de la page ; le zoom de départ fait tenir la page dans la largeur restante.
  // Choix mémorisés : en-tête déplié ou non, colonne repliée ou non.
  const [ui, setUi] = useState(() => lireInterface());
  useEffect(() => { ecrireInterface(ui); }, [ui]);
  const peekEntete = usePeek();
  const avecColonne = reglages.niveau !== 'p1p2';
  const [zoom, setZoom] = useState(() => (avecColonne ? zoomAjuste(window.innerWidth - (ui.colonneRepliee ? LARGEUR_BANDE_PX : LARGEUR_COLONNE_PX) - 48, initial.pages[0]?.largeurMm ?? 210) : 1));
  const [pageActive, setPageActive] = useState(0);
  const [etatStylet, setEtatStylet] = useState<EtatStylet>(ETAT_INITIAL);
  const [message, setMessage] = useState<{ type: 'erreur' | 'info'; texte: string } | null>(null);

  useEffect(() => {
    if (initial.source.type !== 'pdf') return;
    let vivant = true;
    ouvrirPdf(initial.source.data)
      .then(d => vivant && setPdf(d))
      .catch(() => setMessage({ type: 'erreur', texte: 'Impossible d’afficher ce PDF.' }));
    return () => { vivant = false; };
  }, [initial]);

  const dernier = useRef(doc);
  dernier.current = doc;
  const validations = useRef(new Map<number, () => void>());
  const dernierEnregistre = useRef<CahierDoc | null>(initial);
  const enregistrer = useCallback(() => {
    const d = dernier.current;
    if (d === dernierEnregistre.current) return;
    dernierEnregistre.current = d;
    stockage.enregistrer(d).catch(() => {
      if (dernierEnregistre.current === d) dernierEnregistre.current = null; // réessayer au prochain déclencheur
      setMessage({ type: 'erreur', texte: 'Sauvegarde impossible (stockage plein ?). Exportez votre travail en fichier .cahier.' });
    });
  }, [stockage]);

  // Sauvegarde automatique, 800 ms après la dernière modification.
  useEffect(() => {
    if (doc === dernierEnregistre.current) return;
    const t = setTimeout(enregistrer, 800);
    return () => clearTimeout(t);
  }, [doc, enregistrer]);

  // Tout de suite si l'app passe en arrière-plan (iPad : l'onglet peut être tué sans autre avertissement), et à la fermeture.
  // La saisie ouverte (texte, opération…) est d'abord validée : sinon un objet en cours serait perdu.
  useEffect(() => {
    const toutEnregistrer = () => {
      for (const valider of validations.current.values()) valider();
      enregistrer();
    };
    const siCache = () => { if (document.visibilityState === 'hidden') toutEnregistrer(); };
    document.addEventListener('visibilitychange', siCache);
    window.addEventListener('pagehide', toutEnregistrer);
    return () => {
      document.removeEventListener('visibilitychange', siCache);
      window.removeEventListener('pagehide', toutEnregistrer);
      enregistrer();
    };
  }, [enregistrer]);

  // dernier.current tout de suite : une validation de texte suivie d'une fermeture/export dans le même événement doit être vue.
  // Une fonction est appliquée au dernier document : plusieurs validations dans le même événement (deux pages) se cumulent.
  const commit = (maj: CahierDoc | ((d: CahierDoc) => CahierDoc)) => {
    const d = typeof maj === 'function' ? maj(dernier.current) : maj;
    dernier.current = d;
    dispatch({ type: 'commit', doc: d });
  };

  // Outils Sélectionner, Formes et Droite : les objets choisis se modifient par la barre (couleur, épaisseur, grouper, supprimer…).
  const outilSelection = outil === 'formes' || outil === 'selectionner' || outil === 'droite';
  const idsChoisis = outilSelection && selection ? selection.ids : [];
  const objetsChoisis = selection ? (doc.pages[selection.page]?.objets ?? []).filter(o => idsChoisis.includes(o.id)) : [];
  const unSeul = objetsChoisis.length === 1 ? objetsChoisis[0] : undefined;
  const estSurligneur = (o: (typeof objetsChoisis)[number]) => o.type === 'trait' && !!o.surligneur;
  const tousSurligneur = objetsChoisis.length > 0 && objetsChoisis.every(estSurligneur);
  const aEpaisseur = objetsChoisis.some(o => o.type === 'forme' || o.type === 'droite' || (o.type === 'trait' && !o.surligneur));
  const groupesChoisis = new Set(objetsChoisis.map(o => o.groupe));
  const dejaUnGroupe = groupesChoisis.size === 1 && !groupesChoisis.has(undefined); // la sélection est exactement un groupe
  const choisirCouleur = (c: string) => {
    if (surligneur || tousSurligneur) setCouleurSurligneur(c);
    else setCouleurEncre(c);
    if (selection && objetsChoisis.length > 0) commit(recolorerObjets(dernier.current, selection.page, idsChoisis, c, tousSurligneur));
  };
  const choisirEpaisseur = (e: number) => {
    setEpaisseurEncre(e);
    if (selection && aEpaisseur) commit(epaissirObjets(dernier.current, selection.page, idsChoisis, e));
  };
  // Surligneurs choisis : le curseur montre leur épaisseur (si elle est commune), pas celle de l'outil.
  const epaisseursChoisies = new Set(objetsChoisis.filter(estSurligneur).map(o => (o.type === 'trait' ? o.epaisseur : 0)));
  const epaisseurSurligneurAffichee = outil === 'selectionner' && tousSurligneur && epaisseursChoisies.size === 1 ? [...epaisseursChoisies][0] : epaisseurSurligneur;
  const choisirEpaisseurSurligneur = (mm: number) => {
    setEpaisseurSurligneur(mm);
    if (selection && tousSurligneur) commit(epaissirObjets(dernier.current, selection.page, idsChoisis, mm, true));
  };
  // Textes choisis (outil Sélectionner) : leur taille se change ; avec l'outil Texte, elle vaut pour les nouveaux textes.
  const textesChoisis = outil === 'selectionner' ? objetsChoisis.filter(o => o.type === 'texte') : [];
  const taillesChoisies = new Set(textesChoisis.map(o => (o.type === 'texte' ? o.taillePt : 0)));
  const choisirTaille = (pt: number) => {
    if (outil === 'texte') { setTaillePtTexte(pt); return; }
    if (selection && textesChoisis.length > 0) commit(redimensionnerTextes(dernier.current, selection.page, idsChoisis, pt));
  };
  const choisirOutil = (o: OutilId) => {
    setOutil(o);
    if (o !== 'formes' && o !== 'selectionner' && o !== 'droite') setSelection(null);
    if (o !== 'selectionner') setChoixMultiple(false);
  };
  const supprimerChoisis = () => {
    if (!selection || objetsChoisis.length === 0) return;
    commit(supprimerObjets(dernier.current, selection.page, idsChoisis));
    setSelection(null);
  };
  const grouperChoisis = () => {
    if (selection) commit(grouperObjets(dernier.current, selection.page, idsChoisis));
  };
  const degrouperChoisis = () => {
    if (selection) commit(degrouperObjets(dernier.current, selection.page, idsChoisis));
  };

  // Chaque page inscrit de quoi valider sa saisie ouverte (texte ou objet maths) : appelé de façon synchrone avant
  // export, .cahier et retour, et quand on touche une autre page (une seule saisie ouverte à la fois).
  const inscrireValidation = useCallback((page: number, valider: () => void) => {
    validations.current.set(page, valider);
    return () => {
      if (validations.current.get(page) === valider) validations.current.delete(page);
    };
  }, []);
  const validerAutres = (page: number | null) => {
    for (const [i, valider] of validations.current) if (i !== page) valider();
  };

  // iOS ne déclenche pas toujours blur : on valide explicitement toute saisie ouverte.
  const validerSaisie = () => {
    (document.activeElement as HTMLElement | null)?.blur();
    validerAutres(null);
  };

  // Copie les pages choisies dans un nouveau document de la bibliothèque (même dossier) ; l'original ne bouge pas.
  const extrairePages = async (indices: number[]) => {
    validerSaisie();
    const d = dernier.current;
    const numeros = indices.map(i => i + 1);
    const titre = `${d.titre} (${numeros.length === 1 ? 'page' : 'pages'} ${numeros.join(', ')})`;
    try {
      const nouveau = await extraireDocument(d, indices, titre);
      await stockage.enregistrer(nouveau);
      const dossierId = (await stockage.lister()).find(m => m.id === d.id)?.dossierId;
      if (dossierId) await stockage.deplacer(nouveau.id, dossierId);
      setPagesOuvert(false);
      setMessage({ type: 'info', texte: `Nouveau document « ${titre} » créé : le retrouver dans « Mes documents ».` });
    } catch {
      setMessage({ type: 'erreur', texte: 'L’extraction a échoué. Votre document est intact : réessayez.' });
    }
  };

  const ajouterPhotos = async (fichiers: File[]) => {
    if (fichiers.length === 0) return;
    validerSaisie();
    try {
      const { images, tailles } = await preparerPhotos(fichiers);
      commit(ajouterPagesPhotos(dernier.current, images, tailles));
    } catch (e) {
      setMessage({ type: 'erreur', texte: e instanceof PhotoIllisibleError ? e.message : 'Les photos n’ont pas pu être ajoutées. Réessayer.' });
    }
  };

  const fermer = () => {
    validerSaisie();
    onFermer();
  };

  const exporter = async () => {
    validerSaisie();
    const doc = dernier.current;
    try {
      if (doc.source.type === 'pdf' && (await aDesPagesTournees(doc.source.data))) {
        setMessage({ type: 'info', texte: 'Attention : ce PDF contient des pages tournées, les annotations peuvent être décalées dans l’export.' });
      }
      const octets = await exporterPdf(doc, {
        rendreExpression: o => import('../maths/rasteriser').then(m => m.rasteriserExpression(o)),
      });
      await partagerOuTelecharger(new Blob([new Uint8Array(octets)], { type: 'application/pdf' }), `${nomFichier(doc.titre)}.pdf`);
    } catch {
      setMessage({ type: 'erreur', texte: 'L’export PDF a échoué. Votre travail est conservé : réessayez.' });
    }
  };

  const exporterCahier = async () => {
    validerSaisie();
    const doc = dernier.current;
    try {
      await partagerOuTelecharger(await versCahier(doc), `${nomFichier(doc.titre)}.cahier`);
    } catch {
      setMessage({ type: 'erreur', texte: 'L’enregistrement du fichier .cahier a échoué. Réessayez.' });
    }
  };

  const dessine = outil !== 'main' && outil !== 'gomme-objet' && outil !== 'gomme-partielle';
  const proprietes: PropsOutils = {
    niveau: reglages.niveau,
    outil, setOutil: choisirOutil,
    couleur, setCouleur: choisirCouleur,
    epaisseur: epaisseurEncre, setEpaisseur: choisirEpaisseur,
    formeChoisie, setFormeChoisie,
    // Réglages affichés seulement pour les outils qui s'en servent (pas pour Main ni les gommes).
    surligneur: surligneur || (outil === 'selectionner' && tousSurligneur)
      ? { mode: modeSurligneur, setMode: setModeSurligneur, afficherMode: surligneur, epaisseur: epaisseurSurligneurAffichee, setEpaisseur: choisirEpaisseurSurligneur, couleur: couleurSurligneur }
      : undefined,
    tailleTexte: outil === 'texte'
      ? { valeur: taillePtTexte, onChoisir: choisirTaille }
      : textesChoisis.length > 0 ? { valeur: taillesChoisies.size === 1 ? [...taillesChoisies][0] : null, onChoisir: choisirTaille } : undefined,
    palette: outil === 'selectionner' ? (objetsChoisis.length > 0 ? (tousSurligneur ? 'surligneur' : 'encre') : null) : !dessine ? null : surligneur ? 'surligneur' : 'encre',
    montrerEpaisseur: outil === 'selectionner' ? aEpaisseur : outil === 'stylo' || outil === 'formes' || outil === 'droite',
    selection: outil === 'selectionner' ? {
      nombre: objetsChoisis.length,
      multiple: choixMultiple,
      onMultiple: () => setChoixMultiple(m => !m),
      modifiable: !!unSeul && unSeul.type !== 'trait' && unSeul.type !== 'forme' && unSeul.type !== 'droite',
      peutGrouper: objetsChoisis.length >= 2 && !dejaUnGroupe,
      peutDegrouper: objetsChoisis.some(o => o.groupe !== undefined),
      onModifier: () => setOrdreModifier(n => n + 1),
      onGrouper: grouperChoisis,
      onDegrouper: degrouperChoisis,
      onSupprimer: supprimerChoisis,
    } : undefined,
    fond: doc.pages[pageActive]?.fond ?? 'aucun',
    setFond: f => commit(changerFond(doc, pageActive, f)),
    peutAnnuler: peutAnnuler(h), peutRetablir: peutRetablir(h),
    onAnnuler: () => dispatch({ type: 'annuler' }), onRetablir: () => dispatch({ type: 'retablir' }),
    zoom, setZoom,
  };
  const pages = (
      <div className={`mx-3 mb-6 mt-3 overflow-auto rounded-2xl bg-[var(--surface2)] py-2 ${avecColonne ? 'min-w-0 flex-1' : ''}`}>
        {doc.pages.map((_, i) => (
          <PageVue
            key={i}
            doc={doc}
            pageIndex={i}
            pxMm={pxParMm(zoom)}
            outil={outil}
            couleur={couleur}
            epaisseur={epaisseur}
            mode={reglages.modeEntree}
            etatStylet={etatStylet}
            setEtatStylet={setEtatStylet}
            pdf={pdf}
            niveau={reglages.niveau}
            formeChoisie={formeChoisie}
            photoUrl={photoUrls[doc.pages[i].origine ?? i]}
            modeSurligneur={modeSurligneur}
            taillePtTexte={taillePtTexte}
            selectionId={outilSelection && selection?.page === i && selection.ids.length === 1 ? selection.ids[0] : null}
            selectionIds={outilSelection && selection?.page === i ? selection.ids : []}
            choixMultiple={choixMultiple}
            ordreModifier={ordreModifier}
            onSelection={ids => setSelection(ids.length > 0 ? { page: i, ids } : null)}
            onCommit={commit}
            onActive={() => {
              validerAutres(i);
              setPageActive(i);
            }}
            inscrireValidation={inscrireValidation}
          />
        ))}
      </div>
  );

  return (
    <div>
      <div className="carte-flottante relative mx-3 mt-3 p-3">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="plai-btn-secondaire min-h-[44px]" onClick={fermer}><IconeUi nom="retour" />Retour à mes documents</button>
          <h1 className="min-w-0 flex-1 truncate text-xl font-bold" title={doc.titre}>{doc.titre}</h1>
          <button type="button" className="plai-btn min-h-[44px]" onClick={exporter} aria-describedby="aide-export-pdf"
            title="Pour rendre le travail ou l’imprimer. Les annotations ne se modifient plus ensuite."><IconeUi nom="telecharger" />Exporter en PDF</button>
          <button type="button" className="plai-btn-secondaire min-h-[44px]" onClick={exporterCahier} aria-describedby="aide-export-cahier"
            title="Pour continuer plus tard ou sur un autre appareil. Seul CahierActif le rouvre."><IconeUi nom="fichier" />Enregistrer un fichier .cahier</button>
          <button
            type="button"
            className="plai-btn-secondaire min-h-[44px]"
            aria-expanded={ui.enteteDeplie}
            aria-controls="entete-details"
            title={ui.enteteDeplie ? 'Replier les options et les explications' : 'Plus d’options : pages, photos, fond de page'}
            {...peekEntete.liens}
            onClick={() => { peekEntete.fermer(); setUi(u => ({ ...u, enteteDeplie: !u.enteteDeplie })); }}
          >
            <IconeUi nom={ui.enteteDeplie ? 'haut' : 'bas'} />{ui.enteteDeplie ? 'Replier' : 'Plus d’options'}
          </button>
        </div>
        {/* Sélecteurs de fichiers hors du volet : un aperçu qui se ferme ne doit pas les démonter pendant le choix. */}
        {doc.source.type === 'photos' && (
          <>
            <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={e => { const f = Array.from(e.target.files ?? []); e.target.value = ''; void ajouterPhotos(f); }} />
            <input ref={photosInput} type="file" accept="image/*" multiple hidden onChange={e => { const f = Array.from(e.target.files ?? []); e.target.value = ''; void ajouterPhotos(f); }} />
          </>
        )}
        {(ui.enteteDeplie || peekEntete.peek) && (
          <div
            id="entete-details"
            className={ui.enteteDeplie ? 'mt-3 border-t border-[var(--border)] pt-3' : 'carte-flottante absolute left-0 right-0 top-full z-[60] mt-1 p-3 shadow-2xl ring-1 ring-[var(--border2)]'}
            {...(ui.enteteDeplie ? {} : peekEntete.liens)}
          >
            <div className="flex flex-wrap items-start gap-x-6 gap-y-2">
              <p id="aide-export-pdf" className="max-w-[18rem] text-base text-[var(--text2)]"><strong>Exporter en PDF :</strong> pour rendre le travail ou l’imprimer. Les annotations ne se modifient plus ensuite.</p>
              <p id="aide-export-cahier" className="max-w-[18rem] text-base text-[var(--text2)]"><strong>Fichier .cahier :</strong> pour continuer plus tard ou sur un autre appareil. Seul CahierActif le rouvre.</p>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-3">
              <button type="button" className="plai-btn-secondaire min-h-[44px]" onClick={() => { validerSaisie(); setPagesOuvert(true); }}><IconeUi nom="pages" />Gérer les pages</button>
              {doc.source.type === 'photos' && (
                <>
                  <button type="button" className="plai-btn-secondaire min-h-[44px]" onClick={() => cameraInput.current?.click()}>Photographier une page</button>
                  <button type="button" className="plai-btn-secondaire min-h-[44px]" onClick={() => photosInput.current?.click()}>Ajouter des photos</button>
                </>
              )}
              {doc.source.type === 'vierge' && (
                <button type="button" className="plai-btn-secondaire min-h-[44px]" onClick={() => commit(ajouterPageVierge(doc))}>Ajouter une page</button>
              )}
              {avecColonne && (
                <label className="flex items-center gap-2 text-base">
                  Fond de la page
                  <select className="plai-input min-h-[44px]" value={proprietes.fond} onChange={e => proprietes.setFond(e.target.value as Fond)}>
                    {FONDS.map(f => <option key={f.id} value={f.id}>{f.libelle}</option>)}
                  </select>
                </label>
              )}
              {!ui.enteteDeplie && (
                <button type="button" className="plai-btn-secondaire ml-auto min-h-[44px]" onClick={() => { peekEntete.fermer(); setUi(u => ({ ...u, enteteDeplie: true })); }}>
                  Garder déplié
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      {message && (
        <div className={message.type === 'erreur' ? 'plai-error' : 'plai-banner'} role="alert">
          {message.texte} <button type="button" className="min-h-[44px] min-w-[44px] underline" onClick={() => setMessage(null)}>Fermer</button>
        </div>
      )}
      {pagesOuvert && (
        <GestionPages doc={doc} pdf={pdf} photoUrls={photoUrls} onDeplacer={(i, delta) => commit(deplacerPage(dernier.current, i, delta))}
          onExtraire={extrairePages} onRedresser={(i, image, taille) => commit(remplacerPhoto(dernier.current, i, image, taille))} onFermer={() => setPagesOuvert(false)} />
      )}
      {avecColonne ? (
        <div className={`flex ${reglages.colonne === 'droite' ? 'flex-row-reverse' : ''}`}>
          <ColonneRepliable {...proprietes} position={reglages.colonne} replie={ui.colonneRepliee} onBasculer={() => setUi(u => ({ ...u, colonneRepliee: !u.colonneRepliee }))} />
          <div className="flex min-w-0 flex-1 flex-col">
            <BandeauReglages {...proprietes} />
            {pages}
            <BarreBas {...proprietes} />
          </div>
        </div>
      ) : (
        <>
          <BarreOutils {...proprietes} />
          {pages}
        </>
      )}
    </div>
  );
}

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { ETAT_INITIAL, type EtatStylet } from '../input/pointerPolicy';
import { nomFichier, partagerOuTelecharger } from '../lib/partage';
import { pxParMm, zoomAjuste } from '../lib/units';
import type { Reglages } from '../lib/reglages';
import { versCahier } from '../fichier/cahier';
import { annuler, creer, peutAnnuler, peutRetablir, pousser, retablir, type Historique } from '../model/history';
import { COULEURS_SURLIGNEUR, SURLIGNEUR_EPAISSEUR_MM } from '../lib/couleurs';
import { ajouterPageVierge, changerFond, modifierObjet, supprimerObjet } from '../model/ops';
import type { OutilId } from '../model/outils';
import type { CahierDoc, Fond, TypeForme } from '../model/types';
import { aDesPagesTournees } from '../pdf/info';
import { exporterPdf } from '../pdf/export';
import { ouvrirPdf, type PDFDocumentProxy } from '../pdf/pdfjs';
import type { StorageAdapter } from '../storage/adapter';
import { BarreOutils, COULEURS, EPAISSEURS, type PropsOutils } from './BarreOutils';
import { BandeauReglages } from './BandeauReglages';
import { ColonneOutils, LARGEUR_COLONNE_PX } from './ColonneOutils';
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
  const [outil, setOutil] = useState<OutilId>('stylo');
  const [couleurEncre, setCouleurEncre] = useState(COULEURS[0].hex);
  const [couleurSurligneur, setCouleurSurligneur] = useState(COULEURS_SURLIGNEUR[0].hex);
  const [epaisseurEncre, setEpaisseurEncre] = useState(EPAISSEURS[1].mm);
  const [formeChoisie, setFormeChoisie] = useState<TypeForme>('rectangle');
  const [selection, setSelection] = useState<{ page: number; id: string } | null>(null);
  const [ordreModifier, setOrdreModifier] = useState(0);
  const surligneur = outil === 'surligneur';
  // Le surligneur a sa palette et son épaisseur fixes ; les autres outils partagent l'encre.
  const couleur = surligneur ? couleurSurligneur : couleurEncre;
  const epaisseur = surligneur ? SURLIGNEUR_EPAISSEUR_MM : epaisseurEncre;
  // P3 et plus : colonne d'outils à côté de la page ; le zoom de départ fait tenir la page dans la largeur restante.
  const avecColonne = reglages.niveau !== 'p1p2';
  const [zoom, setZoom] = useState(() => (avecColonne ? zoomAjuste(window.innerWidth - LARGEUR_COLONNE_PX - 24, initial.pages[0]?.largeurMm ?? 210) : 1));
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

  // Outils Sélectionner et Formes : l'objet choisi est modifiable par la barre (couleur, épaisseur, Modifier, Supprimer).
  const outilSelection = outil === 'formes' || outil === 'selectionner' || outil === 'droite';
  const objetChoisi = outilSelection && selection ? doc.pages[selection.page]?.objets.find(o => o.id === selection.id) : undefined;
  const choisiSurligneur = objetChoisi?.type === 'trait' && !!objetChoisi.surligneur;
  const aEpaisseur = objetChoisi?.type === 'trait' || objetChoisi?.type === 'forme' || objetChoisi?.type === 'droite';
  const modifierChoisi = (patch: { couleur: string } | { epaisseur: number }) => {
    if (!objetChoisi || !selection) return;
    commit(modifierObjet(dernier.current, selection.page, selection.id, patch));
  };
  const choisirCouleur = (c: string) => {
    if (surligneur || choisiSurligneur) setCouleurSurligneur(c);
    else setCouleurEncre(c);
    modifierChoisi({ couleur: c });
  };
  const choisirEpaisseur = (e: number) => {
    setEpaisseurEncre(e);
    if (aEpaisseur) modifierChoisi({ epaisseur: e });
  };
  const choisirOutil = (o: OutilId) => {
    setOutil(o);
    if (o !== 'formes' && o !== 'selectionner' && o !== 'droite') setSelection(null);
  };
  const supprimerChoisi = () => {
    if (!objetChoisi || !selection) return;
    commit(supprimerObjet(dernier.current, selection.page, selection.id));
    setSelection(null);
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
    palette: outil === 'selectionner' ? (objetChoisi ? (choisiSurligneur ? 'surligneur' : 'encre') : null) : !dessine ? null : surligneur ? 'surligneur' : 'encre',
    montrerEpaisseur: outil === 'selectionner' ? aEpaisseur && !choisiSurligneur : outil === 'stylo' || outil === 'formes' || outil === 'droite',
    selection: outil === 'selectionner' ? {
      present: !!objetChoisi,
      modifiable: !!objetChoisi && objetChoisi.type !== 'trait' && objetChoisi.type !== 'forme' && objetChoisi.type !== 'droite',
      onModifier: () => setOrdreModifier(n => n + 1),
      onSupprimer: supprimerChoisi,
    } : undefined,
    fond: doc.pages[pageActive]?.fond ?? 'aucun',
    setFond: f => commit(changerFond(doc, pageActive, f)),
    peutAnnuler: peutAnnuler(h), peutRetablir: peutRetablir(h),
    onAnnuler: () => dispatch({ type: 'annuler' }), onRetablir: () => dispatch({ type: 'retablir' }),
    zoom, setZoom,
  };
  const pages = (
      <div className={`overflow-auto bg-[var(--surface2)] py-2 ${avecColonne ? 'min-w-0 flex-1' : ''}`}>
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
            selectionId={outilSelection && selection?.page === i ? selection.id : null}
            ordreModifier={ordreModifier}
            onSelection={id => setSelection(id ? { page: i, id } : null)}
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
      <div className="flex flex-wrap items-center gap-2 p-2">
        <button type="button" className="plai-btn min-h-[44px]" onClick={fermer}>Retour à mes documents</button>
        <h1 className="font-serif text-xl">{doc.titre}</h1>
        <span className="flex-1" />
        <button type="button" className="plai-btn min-h-[44px]" onClick={exporter}>Exporter en PDF</button>
        <button type="button" className="plai-btn min-h-[44px]" onClick={exporterCahier}>Enregistrer un fichier .cahier</button>
        {avecColonne && (
          <label className="flex items-center gap-2 text-base">
            Fond de la page
            <select className="plai-input min-h-[44px]" value={proprietes.fond} onChange={e => proprietes.setFond(e.target.value as Fond)}>
              {FONDS.map(f => <option key={f.id} value={f.id}>{f.libelle}</option>)}
            </select>
          </label>
        )}
        {doc.source.type === 'vierge' && (
          <button type="button" className="plai-btn min-h-[44px]" onClick={() => commit(ajouterPageVierge(doc))}>Ajouter une page</button>
        )}
      </div>
      {message && (
        <div className={message.type === 'erreur' ? 'plai-error' : 'plai-banner'} role="alert">
          {message.texte} <button type="button" className="min-h-[44px] min-w-[44px] underline" onClick={() => setMessage(null)}>Fermer</button>
        </div>
      )}
      {avecColonne ? (
        <div className={`flex ${reglages.colonne === 'droite' ? 'flex-row-reverse' : ''}`}>
          <ColonneOutils {...proprietes} position={reglages.colonne} />
          <div className="flex min-w-0 flex-1 flex-col">
            <BandeauReglages {...proprietes} />
            {pages}
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

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { ETAT_INITIAL, type EtatStylet } from '../input/pointerPolicy';
import { nomFichier, partagerOuTelecharger } from '../lib/partage';
import { pxParMm } from '../lib/units';
import type { Reglages } from '../lib/reglages';
import { versCahier } from '../fichier/cahier';
import { annuler, creer, peutAnnuler, peutRetablir, pousser, retablir, type Historique } from '../model/history';
import { ajouterPageVierge, changerFond } from '../model/ops';
import type { OutilId } from '../model/outils';
import type { CahierDoc } from '../model/types';
import { aDesPagesTournees } from '../pdf/info';
import { exporterPdf } from '../pdf/export';
import { ouvrirPdf, type PDFDocumentProxy } from '../pdf/pdfjs';
import type { StorageAdapter } from '../storage/adapter';
import { BarreOutils, COULEURS, EPAISSEURS } from './BarreOutils';
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
  const [couleur, setCouleur] = useState(COULEURS[0].hex);
  const [epaisseur, setEpaisseur] = useState(EPAISSEURS[1].mm);
  const [zoom, setZoom] = useState(1);
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
  useEffect(() => {
    const siCache = () => { if (document.visibilityState === 'hidden') enregistrer(); };
    document.addEventListener('visibilitychange', siCache);
    window.addEventListener('pagehide', enregistrer);
    return () => {
      document.removeEventListener('visibilitychange', siCache);
      window.removeEventListener('pagehide', enregistrer);
      enregistrer();
    };
  }, [enregistrer]);

  // dernier.current tout de suite : une validation de texte suivie d'une fermeture/export dans le même événement doit être vue.
  const commit = (d: CahierDoc) => {
    dernier.current = d;
    dispatch({ type: 'commit', doc: d });
  };

  // iOS ne déclenche pas toujours blur : on force la validation d'une zone de texte ouverte.
  const validerSaisie = () => (document.activeElement as HTMLElement | null)?.blur();

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
      const octets = await exporterPdf(doc);
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

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 p-2">
        <button type="button" className="plai-btn min-h-[44px]" onClick={fermer}>Retour à mes documents</button>
        <h1 className="font-serif text-xl">{doc.titre}</h1>
        <span className="flex-1" />
        <button type="button" className="plai-btn min-h-[44px]" onClick={exporter}>Exporter en PDF</button>
        <button type="button" className="plai-btn min-h-[44px]" onClick={exporterCahier}>Enregistrer un fichier .cahier</button>
        {doc.source.type === 'vierge' && (
          <button type="button" className="plai-btn min-h-[44px]" onClick={() => commit(ajouterPageVierge(doc))}>Ajouter une page</button>
        )}
      </div>
      {message && (
        <div className={message.type === 'erreur' ? 'plai-error' : 'plai-banner'} role="alert">
          {message.texte} <button type="button" className="min-h-[44px] min-w-[44px] underline" onClick={() => setMessage(null)}>Fermer</button>
        </div>
      )}
      <BarreOutils
        niveau={reglages.niveau}
        outil={outil} setOutil={setOutil}
        couleur={couleur} setCouleur={setCouleur}
        epaisseur={epaisseur} setEpaisseur={setEpaisseur}
        fond={doc.pages[pageActive]?.fond ?? 'aucun'}
        setFond={f => commit(changerFond(doc, pageActive, f))}
        peutAnnuler={peutAnnuler(h)} peutRetablir={peutRetablir(h)}
        onAnnuler={() => dispatch({ type: 'annuler' })} onRetablir={() => dispatch({ type: 'retablir' })}
        zoom={zoom} setZoom={setZoom}
      />
      <div className="overflow-auto bg-[var(--surface2)] py-2">
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
            onCommit={commit}
            onActive={() => setPageActive(i)}
          />
        ))}
      </div>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ecrireReglages, lireReglages, type Reglages as R } from './lib/reglages';
import { ecrireVerrou, lireVerrou, verifierCode, type Verrou } from './lib/verrou';
import type { CahierDoc } from './model/types';
import { creerIndexedDBAdapter } from './storage/indexeddb';
import { BanniereInstallation } from './ui/BanniereInstallation';
import { BanniereMiseAJour } from './ui/BanniereMiseAJour';
import { Bibliotheque } from './ui/Bibliotheque';
import { DialogueCode, VerrouContexte } from './ui/DialogueCode';
import { Editeur } from './ui/Editeur';
import { Reglages } from './ui/Reglages';

type Ecran = { nom: 'bibliotheque' } | { nom: 'reglages' } | { nom: 'document'; doc: CahierDoc };

export default function App() {
  const stockage = useMemo(() => creerIndexedDBAdapter(), []);
  const [reglages, setReglages] = useState<R | null>(() => lireReglages());
  const [ecran, setEcran] = useState<Ecran>(reglages ? { nom: 'bibliotheque' } : { nom: 'reglages' });

  // Mode verrouillé : le code d'adulte est demandé pour ouvrir les Réglages et pour supprimer un document ou un dossier.
  const [verrou, setVerrou] = useState<Verrou | null>(() => lireVerrou());
  const [demandeCode, setDemandeCode] = useState<{ fin: (ok: boolean) => void } | null>(null);
  const verrouRef = useRef(verrou);
  verrouRef.current = verrou;
  const demander = useCallback(
    () => (verrouRef.current ? new Promise<boolean>(resolve => setDemandeCode({ fin: resolve })) : Promise.resolve(true)),
    [],
  );
  const changerVerrou = (v: Verrou | null) => { ecrireVerrou(v); setVerrou(v); };
  const ouvrirReglages = async () => { if (await demander()) setEcran({ nom: 'reglages' }); };

  // Chaque écran s'ouvre en haut : sans cela, la position de l'écran précédent est gardée et le titre se retrouve coupé.
  const cleEcran = ecran.nom === 'document' ? `document-${ecran.doc.id}` : ecran.nom;
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); }, [cleEcran]);

  // Demande au navigateur de ne pas effacer les données (accordé si l'app est installée).
  useEffect(() => { void navigator.storage?.persist?.(); }, []);

  const valider = (r: R) => {
    ecrireReglages(r);
    setReglages(r);
    setEcran({ nom: 'bibliotheque' });
  };

  return (
    <VerrouContexte.Provider value={{ actif: verrou !== null, demander }}>
      <nav className="plai-nav">
        <button type="button" className="plai-nav-logo" onClick={() => reglages && setEcran({ nom: 'bibliotheque' })} aria-label="CahierActif, retour à mes documents">
          <span className="marque">Cahier<span>Actif</span></span>
        </button>
        <div className="plai-nav-actions">
          <a className="plai-nav-link inline-flex min-h-[44px] items-center" href="/mode-emploi.html" target="_blank" rel="noopener">Mode d’emploi<span className="sr-only"> (s’ouvre dans un nouvel onglet)</span></a>
          {reglages && ecran.nom !== 'document' && (
            <button type="button" className="plai-nav-link min-h-[44px]" onClick={() => void ouvrirReglages()}>Réglages</button>
          )}
          <img src="/plai-logo.jpg" alt="PLAI" style={{ height: 32, width: 'auto', marginLeft: 8 }} />
        </div>
      </nav>
      <BanniereInstallation />
      <BanniereMiseAJour />
      <main>
        {ecran.nom === 'reglages' || !reglages ? (
          <Reglages initial={reglages} onValider={valider} verrouActif={verrou !== null} onVerrou={changerVerrou} />
        ) : ecran.nom === 'document' ? (
          <Editeur key={ecran.doc.id} initial={ecran.doc} reglages={reglages} stockage={stockage} onFermer={() => setEcran({ nom: 'bibliotheque' })} />
        ) : (
          <Bibliotheque stockage={stockage} reglages={reglages} onOuvrir={doc => setEcran({ nom: 'document', doc })} />
        )}
      </main>
      <footer className="plai-footer">
        <img src="/plai-logo.jpg" alt="PLAI" style={{ height: 40, width: 'auto' }} />
        <span>CahierActif · PLAI · Pôle Territorial de la Ville de Liège</span>
      </footer>
      {demandeCode && verrou && (
        <DialogueCode
          onValider={async code => {
            if (!(await verifierCode(code, verrou))) return false;
            demandeCode.fin(true);
            setDemandeCode(null);
            return true;
          }}
          onAnnuler={() => { demandeCode.fin(false); setDemandeCode(null); }}
        />
      )}
    </VerrouContexte.Provider>
  );
}

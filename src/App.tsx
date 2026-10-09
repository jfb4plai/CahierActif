import { useEffect, useMemo, useState } from 'react';
import { ecrireReglages, lireReglages, type Reglages as R } from './lib/reglages';
import type { CahierDoc } from './model/types';
import { creerIndexedDBAdapter } from './storage/indexeddb';
import { BanniereInstallation } from './ui/BanniereInstallation';
import { Bibliotheque } from './ui/Bibliotheque';
import { Editeur } from './ui/Editeur';
import { Reglages } from './ui/Reglages';

type Ecran = { nom: 'bibliotheque' } | { nom: 'reglages' } | { nom: 'document'; doc: CahierDoc };

export default function App() {
  const stockage = useMemo(() => creerIndexedDBAdapter(), []);
  const [reglages, setReglages] = useState<R | null>(() => lireReglages());
  const [ecran, setEcran] = useState<Ecran>(reglages ? { nom: 'bibliotheque' } : { nom: 'reglages' });

  // Demande au navigateur de ne pas effacer les données (accordé si l'app est installée).
  useEffect(() => { void navigator.storage?.persist?.(); }, []);

  const valider = (r: R) => {
    ecrireReglages(r);
    setReglages(r);
    setEcran({ nom: 'bibliotheque' });
  };

  return (
    <>
      <nav className="plai-nav">
        <button type="button" className="plai-nav-logo" onClick={() => reglages && setEcran({ nom: 'bibliotheque' })}>
          <img src="/plai-logo.jpg" alt="PLAI" style={{ height: 32, width: 'auto' }} />
          CahierActif
        </button>
        <div className="plai-nav-actions">
          {reglages && ecran.nom !== 'document' && (
            <button type="button" className="plai-nav-link min-h-[44px]" onClick={() => setEcran({ nom: 'reglages' })}>Réglages</button>
          )}
        </div>
      </nav>
      <BanniereInstallation />
      <main>
        {ecran.nom === 'reglages' || !reglages ? (
          <Reglages initial={reglages} onValider={valider} />
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
    </>
  );
}

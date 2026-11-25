import { useEffect, useRef, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';

type Etat = null | 'prete' | 'chargement-impossible';

/**
 * Nouvelle version : elle attend que l'élève la demande (le travail est enregistré automatiquement).
 * Et si un fichier de l'application est introuvable (version publiée pendant que la page était ouverte),
 * on propose de recharger au lieu de laisser un écran figé.
 */
export function BanniereMiseAJour() {
  const [etat, setEtat] = useState<Etat>(null);
  const mettreAJour = useRef<(recharger?: boolean) => Promise<void>>();

  useEffect(() => {
    let minuterie: number | undefined;
    let surRetour: (() => void) | undefined;
    mettreAJour.current = registerSW({
      onNeedRefresh: () => setEtat(e => e ?? 'prete'),
      // Le navigateur ne cherche une nouvelle version qu'à l'ouverture de la page : une application laissée ouverte
      // des jours ne verrait rien. On cherche au retour sur l'application et toutes les heures.
      onRegisteredSW(_url, reg) {
        if (!reg) return;
        const chercher = () => { void reg.update().catch(() => undefined); };
        minuterie = window.setInterval(chercher, 60 * 60 * 1000);
        surRetour = () => { if (document.visibilityState === 'visible') chercher(); };
        document.addEventListener('visibilitychange', surRetour);
      },
    });
    // Vite signale l'échec d'un chargement à la demande avant de le laisser échouer.
    const surEchec = (e: Event) => { e.preventDefault(); setEtat('chargement-impossible'); };
    window.addEventListener('vite:preloadError', surEchec);
    return () => {
      window.removeEventListener('vite:preloadError', surEchec);
      window.clearInterval(minuterie);
      if (surRetour) document.removeEventListener('visibilitychange', surRetour);
    };
  }, []);

  if (!etat) return null;
  return (
    <div className="plai-banner flex flex-wrap items-center justify-center gap-3" role="alert">
      <span>
        {etat === 'prete'
          ? 'Une nouvelle version de CahierActif est prête. Votre travail est enregistré automatiquement.'
          : 'Une partie de l’application n’a pas pu être chargée, sans doute parce qu’une nouvelle version vient d’être publiée. Recharger la page règle le problème ; votre travail est enregistré.'}
      </span>
      <button
        type="button"
        className="plai-btn min-h-[44px]"
        onClick={() => {
          if (etat === 'prete' && mettreAJour.current) {
            void mettreAJour.current(true); // active la nouvelle version, puis recharge
            // Page jamais contrôlée par le service worker (première visite) : aucun rechargement automatique, on le fait.
            window.setTimeout(() => window.location.reload(), 1500);
          } else {
            window.location.reload();
          }
        }}
      >
        {etat === 'prete' ? 'Mettre à jour' : 'Recharger la page'}
      </button>
      {etat === 'prete' && <button type="button" className="plai-btn-secondaire min-h-[44px]" onClick={() => setEtat(null)}>Plus tard</button>}
    </div>
  );
}

function estIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function estInstallee(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
}

/** Safari peut effacer les données d'un site non installé après 7 jours sans visite. */
export function BanniereInstallation() {
  if (!estIOS() || estInstallee()) return null;
  return (
    <div className="plai-banner" role="note">
      Sur iPad : touchez Partager puis « Sur l’écran d’accueil » pour installer CahierActif. Sinon, l’iPad peut effacer vos documents après quelques jours sans utilisation.
    </div>
  );
}

/**
 * Petite image de la page affichée, pour la liste des documents : on recopie, dans l'ordre, les canvas (PDF, annotations)
 * et les images (photo de feuille) déjà dessinés à l'écran. Rien n'est recalculé. Renvoie null si la page n'est pas affichée
 * ou n'a encore rien de dessiné.
 */
export const MINIATURE_LARGEUR_PX = 160;

export function creerMiniature(page: HTMLElement | null): string | null {
  if (!page) return null;
  const rect = page.getBoundingClientRect();
  if (rect.width < 10 || rect.height < 10) return null;
  const largeur = MINIATURE_LARGEUR_PX;
  const hauteur = Math.round((largeur * rect.height) / rect.width);
  const c = document.createElement('canvas');
  c.width = largeur;
  c.height = hauteur;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, largeur, hauteur);
  const echelle = largeur / rect.width;
  try {
    for (const el of page.querySelectorAll<HTMLCanvasElement | HTMLImageElement>('canvas, img')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (el instanceof HTMLImageElement && !el.complete) continue;
      ctx.drawImage(el, (r.left - rect.left) * echelle, (r.top - rect.top) * echelle, r.width * echelle, r.height * echelle);
    }
    return c.toDataURL('image/jpeg', 0.7);
  } catch {
    return null; // canvas souillé ou indisponible : pas de miniature, la liste garde son icône
  }
}

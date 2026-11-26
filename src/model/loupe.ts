/**
 * Loupe : une fenêtre ronde, posée sur la page, qui montre en direct ce qu'elle recouvre en plus grand.
 * Elle ne fait pas partie du document. Centre en mm de page ; taille à l'écran fixe (DIAMETRE_LOUPE_PX), quel que soit le zoom.
 */
export type Loupe = { page: number; x: number; y: number; facteur: number };

export const FACTEURS_LOUPE = [2, 3, 4] as const;
export const FACTEUR_LOUPE_DEFAUT = 2;
export const DIAMETRE_LOUPE_PX = 200;

/** Zone de la page (px, repère de la page à l'écran) que la loupe agrandit : centrée sur (cx, cy), côté = diamètre / facteur. */
export function zoneAgrandie(cx: number, cy: number, diametrePx: number, facteur: number): { x: number; y: number; cote: number } {
  const cote = diametrePx / facteur;
  return { x: cx - cote / 2, y: cy - cote / 2, cote };
}

/**
 * Où dessiner un élément de la page (canvas ou image) dans la loupe : position et taille de destination, en px de loupe,
 * pour un élément dont le coin est en (elX, elY) et la taille (elL, elH) dans le repère de la page à l'écran.
 */
export function destination(elX: number, elY: number, elL: number, elH: number, cx: number, cy: number, diametrePx: number, facteur: number) {
  return { x: (elX - cx) * facteur + diametrePx / 2, y: (elY - cy) * facteur + diametrePx / 2, l: elL * facteur, h: elH * facteur };
}

/** Pose de départ : au milieu de la partie visible de la page (cadres en px d'écran), sans sortir de la page. */
export function centrerLoupe(
  page: { left: number; top: number; width: number; height: number },
  visible: { gauche: number; droite: number; haut: number; bas: number },
  largeurMm: number, hauteurMm: number,
): { x: number; y: number } {
  const pxMm = page.width / largeurMm;
  const cx = (Math.max(page.left, visible.gauche) + Math.min(page.left + page.width, visible.droite)) / 2;
  const cy = (Math.max(page.top, visible.haut) + Math.min(page.top + page.height, visible.bas)) / 2;
  const borne = (v: number, max: number) => Math.max(5, Math.min(max - 5, v));
  return { x: borne((cx - page.left) / pxMm, largeurMm), y: borne((cy - page.top) / pxMm, hauteurMm) };
}

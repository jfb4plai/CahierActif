import { centrerLoupe } from './loupe';

/**
 * Cache-ligne : un voile opaque sur la page, avec une fenêtre de 1 à 3 lignes que l'élève fait glisser vers le bas en lisant.
 * Il ne fait pas partie du document (jamais exporté). `y` = haut de la fenêtre, en mm de page.
 */
export type CacheLigne = { page: number; y: number; lignes: number };

export const LIGNES_CACHE = [1, 2, 3] as const;
export const LIGNES_CACHE_DEFAUT = 2;
/** Hauteur d'une ligne de la fenêtre : un texte de fiche en 12-14 pt avec son interligne. */
export const HAUTEUR_LIGNE_CACHE_MM = 10;

export const hauteurFenetre = (lignes: number): number => lignes * HAUTEUR_LIGNE_CACHE_MM;

/** Garde la fenêtre entière dans la page. */
export function borneY(y: number, lignes: number, hauteurPageMm: number): number {
  return Math.max(0, Math.min(hauteurPageMm - hauteurFenetre(lignes), y));
}

/** Pose de départ : fenêtre au milieu de la partie visible de la page. */
export function yInitial(
  page: { left: number; top: number; width: number; height: number },
  visible: { gauche: number; droite: number; haut: number; bas: number },
  largeurMm: number, hauteurMm: number, lignes: number,
): number {
  const centre = centrerLoupe(page, visible, largeurMm, hauteurMm).y;
  return borneY(centre - hauteurFenetre(lignes) / 2, lignes, hauteurMm);
}

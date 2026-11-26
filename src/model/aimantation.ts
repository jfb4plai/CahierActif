import type { Fond, Point } from './types';

type Axe = { pas: number; origine: number };
type Grille = { x: Axe | null; y: Axe | null };

/**
 * Lignes que le fond de page dessine réellement (voir model/fonds.ts : à garder alignés).
 * Seyes : interlignes tous les 2 mm ; verticales tous les 8 mm à partir de la marge, à 40 mm — rien à gauche de la marge.
 */
const GRILLES: Record<Fond, Grille | null> = {
  aucun: null,
  quadrille5: { x: { pas: 5, origine: 0 }, y: { pas: 5, origine: 0 } },
  quadrille10: { x: { pas: 10, origine: 0 }, y: { pas: 10, origine: 0 } },
  pointe: { x: { pas: 5, origine: 0 }, y: { pas: 5, origine: 0 } },
  seyes: { x: { pas: 8, origine: 40 }, y: { pas: 2, origine: 0 } },
};

function aimanterAxe(v: number, axe: Axe | null, max: number, seuil: number): number {
  if (!axe) return v;
  // Le fond ne dessine ni le bord de la page (0 et max) ni rien avant sa première ligne : on n'aimante pas sur ce qui n'existe pas.
  const premier = axe.origine === 0 ? 1 : 0;
  const k = Math.max(premier, Math.round((v - axe.origine) / axe.pas));
  const c = axe.origine + k * axe.pas;
  return c < max && Math.abs(v - c) <= seuil ? c : v;
}

/**
 * Ramène un point sur la ligne (ou le point) du fond de page le plus proche, séparément en x et en y, s'il est à moins de
 * `seuilMm`. Hors de ce seuil, ou sans fond, le point est rendu tel quel. La pression éventuelle est conservée.
 */
export function aimanter(pt: Point, fond: Fond, largeurMm: number, hauteurMm: number, seuilMm: number): Point {
  const g = GRILLES[fond];
  if (!g) return pt;
  return { ...pt, x: aimanterAxe(pt.x, g.x, largeurMm, seuilMm), y: aimanterAxe(pt.y, g.y, hauteurMm, seuilMm) };
}

/** Seuil d'aimantation : environ 12 px à l'écran, quel que soit le zoom (une cible tactile raisonnable). */
export const SEUIL_AIMANT_PX = 12;

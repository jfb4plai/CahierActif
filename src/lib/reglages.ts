import { LISSAGES, type Lissage } from '../model/lissage';
import type { ModeEntree, Niveau } from '../model/types';

/** Côté de la colonne d'outils (P3 et plus) : à droite pour écrire de la main gauche. */
export type PositionColonne = 'gauche' | 'droite';
export type Reglages = { niveau: Niveau; modeEntree: ModeEntree; colonne: PositionColonne; lissage: Lissage };

const CLE = 'cahieractif.reglages';
const NIVEAUX: Niveau[] = ['p1p2', 'p3p6', 'secondaire'];
const MODES: ModeEntree[] = ['souris', 'stylet'];

export function stockageLocal(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function lireReglages(s: Storage | null = stockageLocal()): Reglages | null {
  try {
    const brut = s?.getItem(CLE);
    if (!brut) return null;
    const r = JSON.parse(brut);
    if (!NIVEAUX.includes(r?.niveau) || !MODES.includes(r?.modeEntree)) return null;
    // Réglages enregistrés avant l'existence de la colonne : à gauche par défaut.
    return { niveau: r.niveau, modeEntree: r.modeEntree, colonne: r.colonne === 'droite' ? 'droite' : 'gauche',
      // Réglages enregistrés avant le lissage : aucun lissage, comme avant.
      lissage: LISSAGES.includes(r.lissage) ? r.lissage : 'aucun' };
  } catch {
    return null;
  }
}

export function ecrireReglages(r: Reglages, s: Storage | null = stockageLocal()): void {
  try {
    s?.setItem(CLE, JSON.stringify(r));
  } catch {
    // stockage plein ou bloqué : le réglage vaut pour la session seulement
  }
}

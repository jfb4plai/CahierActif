import type { ModeEntree, Niveau } from '../model/types';

export type Reglages = { niveau: Niveau; modeEntree: ModeEntree };

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
    return { niveau: r.niveau, modeEntree: r.modeEntree };
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

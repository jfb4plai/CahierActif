import { stockageLocal } from './reglages';

/** Ce que l'élève a choisi de garder ouvert ou fermé ; mémorisé sur l'appareil. */
export type Interface = {
  /** En-tête : lignes d'options sous la ligne principale (aide, pages, photos, fond). */
  enteteDeplie: boolean;
  /** Colonne d'outils : réduite à une bande étroite. */
  colonneRepliee: boolean;
};

const CLE = 'cahieractif.interface';
export const INTERFACE_DEFAUT: Interface = { enteteDeplie: false, colonneRepliee: false };

export function lireInterface(s: Storage | null = stockageLocal()): Interface {
  try {
    const r = JSON.parse(s?.getItem(CLE) ?? 'null');
    return {
      enteteDeplie: typeof r?.enteteDeplie === 'boolean' ? r.enteteDeplie : INTERFACE_DEFAUT.enteteDeplie,
      colonneRepliee: typeof r?.colonneRepliee === 'boolean' ? r.colonneRepliee : INTERFACE_DEFAUT.colonneRepliee,
    };
  } catch {
    return { ...INTERFACE_DEFAUT };
  }
}

export function ecrireInterface(i: Interface, s: Storage | null = stockageLocal()): void {
  try {
    s?.setItem(CLE, JSON.stringify(i));
  } catch {
    // stockage plein ou bloqué : le choix vaut pour la session seulement
  }
}

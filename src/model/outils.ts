import type { Niveau } from './types';

export type OutilId = 'main' | 'stylo' | 'gomme-objet' | 'gomme-partielle' | 'texte' | 'deplacer';
export type Outil = { id: OutilId; libelle: string; aide: string; niveaux: Niveau[] };

const TOUS: Niveau[] = ['p1p2', 'p3p6', 'secondaire'];

export const OUTILS: Outil[] = [
  { id: 'main', libelle: 'Main', aide: 'Faire défiler la page sans écrire', niveaux: TOUS },
  { id: 'stylo', libelle: 'Stylo', aide: 'Écrire ou dessiner à main levée', niveaux: TOUS },
  { id: 'gomme-objet', libelle: 'Gomme', aide: 'Toucher un trait ou un texte pour l’effacer en entier', niveaux: TOUS },
  { id: 'gomme-partielle', libelle: 'Gomme fine', aide: 'Effacer seulement une partie d’un trait', niveaux: ['p3p6', 'secondaire'] },
  { id: 'texte', libelle: 'Texte', aide: 'Toucher la page pour écrire au clavier', niveaux: TOUS },
  { id: 'deplacer', libelle: 'Déplacer', aide: 'Glisser un trait ou un texte à un autre endroit', niveaux: ['p3p6', 'secondaire'] },
];

export function outilsPour(n: Niveau): Outil[] {
  return OUTILS.filter(o => o.niveaux.includes(n));
}

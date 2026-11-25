import type { Niveau, Objet } from './types';

export type OutilId =
  | 'main' | 'selectionner' | 'stylo' | 'surligneur' | 'formes' | 'gomme-objet' | 'gomme-partielle' | 'texte'
  | 'operation' | 'fraction' | 'expression' | 'repere';
export type Outil = { id: OutilId; libelle: string; aide: string; niveaux: Niveau[] };

const TOUS: Niveau[] = ['p1p2', 'p3p6', 'secondaire'];

export const OUTILS: Outil[] = [
  { id: 'main', libelle: 'Main', aide: 'Faire défiler la page sans écrire', niveaux: TOUS },
  { id: 'selectionner', libelle: 'Sélectionner', aide: 'Toucher un objet pour le choisir, le glisser pour le déplacer, le toucher encore pour le modifier', niveaux: ['p3p6', 'secondaire'] },
  { id: 'stylo', libelle: 'Stylo', aide: 'Écrire ou dessiner à main levée', niveaux: TOUS },
  { id: 'surligneur', libelle: 'Surligneur', aide: 'Surligner un mot ou une ligne, en 6 couleurs', niveaux: ['p3p6', 'secondaire'] },
  { id: 'formes', libelle: 'Formes', aide: 'Glisser sur la page pour tracer une forme ; la toucher pour la modifier ou la déplacer', niveaux: ['p3p6', 'secondaire'] },
  { id: 'gomme-objet', libelle: 'Gomme', aide: 'Toucher un trait ou un texte pour l’effacer en entier', niveaux: TOUS },
  { id: 'gomme-partielle', libelle: 'Gomme fine', aide: 'Effacer seulement une partie d’un trait', niveaux: ['p3p6', 'secondaire'] },
  { id: 'texte', libelle: 'Texte', aide: 'Toucher la page pour écrire au clavier ; glisser un texte pour le déplacer', niveaux: TOUS },
  { id: 'operation', libelle: 'Opération', aide: 'Toucher la page pour poser une opération en colonnes ; toucher une opération pour la compléter', niveaux: TOUS },
  { id: 'fraction', libelle: 'Fraction', aide: 'Toucher la page pour écrire une fraction', niveaux: ['p3p6', 'secondaire'] },
  { id: 'expression', libelle: 'Expression', aide: 'Écrire une expression mathématique avec le clavier mathématique', niveaux: ['secondaire'] },
  { id: 'repere', libelle: 'Repère', aide: 'Poser un repère cartésien, puis toucher le repère pour placer des points', niveaux: ['secondaire'] },
];

export function outilsPour(n: Niveau): Outil[] {
  return OUTILS.filter(o => o.niveaux.includes(n));
}

/** Outils qui créent un objet en touchant la page, et le modifient ou le déplacent ensuite. */
export const OUTIL_TYPE: Partial<Record<OutilId, Exclude<Objet['type'], 'trait' | 'forme'>>> = {
  texte: 'texte',
  operation: 'operation',
  fraction: 'fraction',
  expression: 'expression',
  repere: 'repere',
};

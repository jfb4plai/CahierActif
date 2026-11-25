import type { Niveau, Objet } from './types';

export type OutilId =
  | 'main' | 'selectionner' | 'stylo' | 'surligneur' | 'formes' | 'gomme-objet' | 'gomme-partielle' | 'texte'
  | 'operation' | 'fraction' | 'expression' | 'repere';
export type GroupeId = 'choisir' | 'ecrire' | 'dessiner' | 'maths' | 'corriger';
export type Outil = { id: OutilId; libelle: string; aide: string; niveaux: Niveau[]; groupe: GroupeId };

/** Groupes de la colonne d'outils (P3 et plus), du plus fréquent au moins fréquent : les derniers sont ceux qui défilent. */
export const GROUPES: { id: GroupeId; titre: string }[] = [
  { id: 'choisir', titre: 'Choisir' },
  { id: 'ecrire', titre: 'Écrire' },
  { id: 'corriger', titre: 'Corriger' },
  { id: 'dessiner', titre: 'Dessiner' },
  { id: 'maths', titre: 'Maths' },
];
const GROUPE_DE: Record<OutilId, GroupeId> = {
  main: 'choisir', selectionner: 'choisir',
  stylo: 'ecrire', surligneur: 'ecrire', texte: 'ecrire',
  formes: 'dessiner',
  operation: 'maths', fraction: 'maths', expression: 'maths', repere: 'maths',
  'gomme-objet': 'corriger', 'gomme-partielle': 'corriger',
};

const TOUS: Niveau[] = ['p1p2', 'p3p6', 'secondaire'];

export const OUTILS: Outil[] = [
  { id: 'main', libelle: 'Main', aide: 'Faire défiler la page sans écrire', niveaux: TOUS, groupe: GROUPE_DE['main'] },
  { id: 'selectionner', libelle: 'Sélectionner', aide: 'Toucher un objet pour le choisir, le glisser pour le déplacer, le toucher encore pour le modifier', niveaux: ['p3p6', 'secondaire'], groupe: GROUPE_DE['selectionner'] },
  { id: 'stylo', libelle: 'Stylo', aide: 'Écrire ou dessiner à main levée', niveaux: TOUS, groupe: GROUPE_DE['stylo'] },
  { id: 'surligneur', libelle: 'Surligneur', aide: 'Surligner un mot ou une ligne, en 6 couleurs', niveaux: ['p3p6', 'secondaire'], groupe: GROUPE_DE['surligneur'] },
  { id: 'formes', libelle: 'Formes', aide: 'Glisser sur la page pour tracer une forme ; la toucher pour la modifier ou la déplacer', niveaux: ['p3p6', 'secondaire'], groupe: GROUPE_DE['formes'] },
  { id: 'gomme-objet', libelle: 'Gomme', aide: 'Toucher un trait ou un texte pour l’effacer en entier', niveaux: TOUS, groupe: GROUPE_DE['gomme-objet'] },
  { id: 'gomme-partielle', libelle: 'Gomme fine', aide: 'Effacer seulement une partie d’un trait', niveaux: ['p3p6', 'secondaire'], groupe: GROUPE_DE['gomme-partielle'] },
  { id: 'texte', libelle: 'Texte', aide: 'Toucher la page pour écrire au clavier ; glisser un texte pour le déplacer', niveaux: TOUS, groupe: GROUPE_DE['texte'] },
  { id: 'operation', libelle: 'Opération', aide: 'Toucher la page pour poser une opération en colonnes ; toucher une opération pour la compléter', niveaux: TOUS, groupe: GROUPE_DE['operation'] },
  { id: 'fraction', libelle: 'Fraction', aide: 'Toucher la page pour écrire une fraction', niveaux: ['p3p6', 'secondaire'], groupe: GROUPE_DE['fraction'] },
  { id: 'expression', libelle: 'Expression', aide: 'Écrire une expression mathématique avec le clavier mathématique', niveaux: ['secondaire'], groupe: GROUPE_DE['expression'] },
  { id: 'repere', libelle: 'Repère', aide: 'Poser un repère cartésien, puis toucher le repère pour placer des points', niveaux: ['secondaire'], groupe: GROUPE_DE['repere'] },
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

/** Outils d'un niveau regroupés pour la colonne ; les groupes vides sont omis. */
export function groupesPour(n: Niveau): { id: GroupeId; titre: string; outils: Outil[] }[] {
  const outils = outilsPour(n);
  return GROUPES.map(g => ({ ...g, outils: outils.filter(o => o.groupe === g.id) })).filter(g => g.outils.length > 0);
}

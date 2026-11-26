import type { Dossier } from '../model/types';

/**
 * Couleurs des cours : une aide de plus pour les distinguer d'un coup d'œil. Le nom du cours reste toujours écrit :
 * la couleur ne porte jamais l'information seule. Fonds pâles, texte noir (contraste très largement au-dessus de 4,5 : 1).
 */
export type CouleurCours = { id: string; nom: string; fond: string; bord: string };

export const PALETTE_COURS: CouleurCours[] = [
  { id: 'jaune', nom: 'Jaune', fond: '#fef9c3', bord: '#ca8a04' },
  { id: 'bleu', nom: 'Bleu', fond: '#dbeafe', bord: '#2563eb' },
  { id: 'cyan', nom: 'Turquoise', fond: '#cffafe', bord: '#0891b2' },
  { id: 'vert', nom: 'Vert', fond: '#dcfce7', bord: '#16a34a' },
  { id: 'orange', nom: 'Orange', fond: '#ffedd5', bord: '#ea580c' },
  { id: 'rose', nom: 'Rose', fond: '#fce7f3', bord: '#db2777' },
  { id: 'violet', nom: 'Violet', fond: '#ede9fe', bord: '#7c3aed' },
  { id: 'rouge', nom: 'Rouge', fond: '#fee2e2', bord: '#dc2626' },
  { id: 'citron', nom: 'Vert citron', fond: '#ecfccb', bord: '#65a30d' },
  { id: 'menthe', nom: 'Menthe', fond: '#ccfbf1', bord: '#0d9488' },
  { id: 'indigo', nom: 'Indigo', fond: '#e0e7ff', bord: '#4f46e5' },
  { id: 'ardoise', nom: 'Gris ardoise', fond: '#e2e8f0', bord: '#475569' },
];

/** Valeur de `couleur` quand l'élève choisit « Aucune » : elle l'emporte sur la couleur par défaut. */
export const SANS_COULEUR = 'aucune';

/** Couleur des cours créés au premier lancement, tant que l'élève n'en a pas choisi une autre. */
const PAR_DEFAUT: Record<string, string> = {
  'defaut-0': 'bleu', // Français
  'defaut-1': 'rose', // Mathématiques
  'defaut-2': 'vert', // Sciences
  'defaut-3': 'orange', // Histoire
  'defaut-4': 'cyan', // Géographie
  'defaut-5': 'violet', // Langues
  'defaut-exemple': 'jaune', // Exemple
};

/** Couleur effective d'un cours, ou undefined (cartouche blanc). Les cours déjà enregistrés sans couleur gardent celle par défaut. */
export function couleurCours(d: Pick<Dossier, 'id' | 'couleur'> | undefined): CouleurCours | undefined {
  if (!d) return undefined;
  if (d.couleur === SANS_COULEUR) return undefined;
  const id = d.couleur ?? PAR_DEFAUT[d.id];
  return PALETTE_COURS.find(c => c.id === id);
}

/** Première couleur de la palette qu'aucun cours n'utilise : proposée à la création d'un cours pour qu'il se distingue des autres. */
export function premiereCouleurLibre(dossiers: Dossier[]): string {
  const prises = new Set(dossiers.map(d => couleurCours(d)?.id));
  return PALETTE_COURS.find(c => !prises.has(c.id))?.id ?? SANS_COULEUR;
}

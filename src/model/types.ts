export type Niveau = 'p1p2' | 'p3p6' | 'secondaire';
export type ModeEntree = 'souris' | 'stylet';

/** Point en mm page ; p = pression 0..1 si disponible. */
export type Point = { x: number; y: number; p?: number };

export type Trait = {
  id: string;
  type: 'trait';
  points: Point[];
  couleur: string; // #rrggbb
  epaisseur: number; // mm
};

export type Texte = {
  id: string;
  type: 'texte';
  x: number; // coin haut-gauche, mm
  y: number;
  largeur: number; // mm
  texte: string;
  taillePt: number;
  couleur: string;
};

export type Operateur = '+' | '-' | '×' | '÷';

/** Opération posée : grille de cases (lignes × colonnes, ligne par ligne), '' = case vide. */
export type OperationPosee = {
  id: string;
  type: 'operation';
  x: number; // coin haut-gauche, mm
  y: number;
  operateur: Operateur;
  colonnes: number;
  lignes: number;
  cases: string[];
  retenues: string[]; // une par colonne ; vide pour ÷
  virgule: number | null; // nombre de colonnes décimales à droite ; null = entiers
  diviseur: string[]; // ÷ seulement
  quotient: string[]; // ÷ seulement
  couleurs: boolean;
  couleur: string;
};

export type Fraction = {
  id: string;
  type: 'fraction';
  x: number;
  y: number;
  numerateur: string;
  denominateur: string;
  taillePt: number;
  couleur: string;
};

export type Expression = {
  id: string;
  type: 'expression';
  x: number;
  y: number;
  latex: string;
  taillePt: number;
  couleur: string;
  largeurMm: number; // calculées au rendu MathJax, servent au toucher et à l'export
  hauteurMm: number;
};

/** Coordonnées en unités du repère. */
export type PointRepere = { nom: string; x: number; y: number };

export type Repere = {
  id: string;
  type: 'repere';
  x: number;
  y: number;
  xmin: number;
  xmax: number;
  ymin: number;
  ymax: number;
  uniteMm: number;
  points: PointRepere[];
  couleur: string;
};

export type ObjetMaths = OperationPosee | Fraction | Expression | Repere;

/** Étendu par le plan 2 (géométrie). */
export type Objet = Trait | Texte | ObjetMaths;

export type Fond = 'aucun' | 'quadrille5' | 'quadrille10' | 'seyes' | 'pointe';

export type Page = {
  largeurMm: number;
  hauteurMm: number;
  fond: Fond;
  objets: Objet[];
};

export type ImageSource = { mime: 'image/jpeg' | 'image/png'; data: ArrayBuffer };

export type Source =
  | { type: 'pdf'; data: ArrayBuffer }
  | { type: 'vierge' }
  | { type: 'photos'; images: ImageSource[] };

export type CahierDoc = {
  id: string;
  titre: string;
  niveau: Niveau;
  cree: number;
  modifie: number;
  source: Source;
  pages: Page[];
};

export type TaillePage = { largeurMm: number; hauteurMm: number };

export const A4: TaillePage = { largeurMm: 210, hauteurMm: 297 };

export function nouvelId(): string {
  return crypto.randomUUID();
}

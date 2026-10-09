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

/** Étendu par les plans 2 (géométrie) et 3 (maths). */
export type Objet = Trait | Texte;

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

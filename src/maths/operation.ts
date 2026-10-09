import { nouvelId } from '../model/types';
import type { Niveau, Operateur, OperationPosee } from '../model/types';

export const CASE_MM = 10;
export const RETENUE_MM = 6;
const ECART_DIVISION_MM = 2;

export type Zone = 'case' | 'retenue' | 'diviseur' | 'quotient';
export type Direction = 'gauche' | 'droite' | 'haut' | 'bas';
export type Cellule = { zone: Zone; index: number; x: number; y: number; l: number; h: number };
export type Segment = { x1: number; y1: number; x2: number; y2: number };
export type GeometrieOperation = {
  largeur: number;
  hauteur: number;
  cellules: Cellule[];
  signe: { x: number; y: number } | null; // centre de la case du signe
  signeSomme: { x: number; y: number } | null; // « + » devant le dernier produit partiel (× avec plusieurs produits)
  barres: Segment[];
  virgule: { x: number; y1: number; y2: number } | null;
};

export type ParamsOperation = {
  operateur: Operateur;
  colonnes: number;
  lignes: number;
  virgule: number | null;
  chiffresDiviseur: number;
  couleurs: boolean;
};

export function operateursPour(n: Niveau): Operateur[] {
  return n === 'p1p2' ? ['+', '-'] : ['+', '-', '×', '÷'];
}
export const decimalesPermises = (n: Niveau) => n === 'secondaire';
export const chiffresDiviseurMax = (n: Niveau) => (n === 'secondaire' ? 3 : 1);

const vides = (n: number) => Array<string>(n).fill('');

export function creerOperation(x: number, y: number, p: ParamsOperation, couleur: string): OperationPosee {
  const div = p.operateur === '÷';
  return {
    id: nouvelId(),
    type: 'operation',
    x,
    y,
    operateur: p.operateur,
    colonnes: p.colonnes,
    lignes: p.lignes,
    cases: vides(p.colonnes * p.lignes),
    retenues: div ? [] : vides(p.colonnes),
    virgule: p.virgule,
    diviseur: div ? vides(p.chiffresDiviseur) : [],
    quotient: div ? vides(p.colonnes) : [],
    couleurs: p.couleurs,
    couleur,
  };
}

/** Nombre de lignes au-dessus de la barre : × → les deux facteurs ; + et − → tous les nombres sauf le résultat. */
const lignesAvantBarre = (o: OperationPosee) => (o.operateur === '×' ? Math.min(2, o.lignes - 1) : o.lignes - 1);

export function geometrieOperation(o: OperationPosee): GeometrieOperation {
  const C = CASE_MM;
  const cellules: Cellule[] = [];
  if (o.operateur !== '÷') {
    const x0 = C; // colonne du signe
    const y0 = RETENUE_MM;
    for (let c = 0; c < o.colonnes; c++) cellules.push({ zone: 'retenue', index: c, x: x0 + c * C, y: 0, l: C, h: RETENUE_MM });
    for (let r = 0; r < o.lignes; r++) {
      for (let c = 0; c < o.colonnes; c++) cellules.push({ zone: 'case', index: r * o.colonnes + c, x: x0 + c * C, y: y0 + r * C, l: C, h: C });
    }
    const nb = lignesAvantBarre(o);
    const largeur = x0 + o.colonnes * C;
    const barres: Segment[] = [{ x1: 0, y1: y0 + nb * C, x2: largeur, y2: y0 + nb * C }];
    // × avec au moins deux produits partiels : on les additionne, d'où un « + » et un second trait avant le résultat.
    const somme = o.operateur === '×' && o.lignes - nb >= 3;
    if (somme) barres.push({ x1: 0, y1: y0 + (o.lignes - 1) * C, x2: largeur, y2: y0 + (o.lignes - 1) * C });
    return {
      largeur,
      hauteur: y0 + o.lignes * C,
      cellules,
      signe: { x: C / 2, y: y0 + (nb - 0.5) * C },
      signeSomme: somme ? { x: C / 2, y: y0 + (o.lignes - 1.5) * C } : null,
      barres,
      virgule: virgule(o, x0, y0),
    };
  }
  for (let r = 0; r < o.lignes; r++) {
    for (let c = 0; c < o.colonnes; c++) cellules.push({ zone: 'case', index: r * o.colonnes + c, x: c * C, y: r * C, l: C, h: C });
  }
  const xd = o.colonnes * C + ECART_DIVISION_MM;
  o.diviseur.forEach((_, i) => cellules.push({ zone: 'diviseur', index: i, x: xd + i * C, y: 0, l: C, h: C }));
  o.quotient.forEach((_, i) => cellules.push({ zone: 'quotient', index: i, x: xd + i * C, y: C, l: C, h: C }));
  const largeurDroite = Math.max(o.diviseur.length, o.quotient.length) * C;
  const hauteur = Math.max(o.lignes, 2) * C;
  const xPotence = xd - ECART_DIVISION_MM / 2;
  return {
    largeur: xd + largeurDroite,
    hauteur,
    cellules,
    signe: null,
    signeSomme: null,
    barres: [
      { x1: xPotence, y1: 0, x2: xPotence, y2: hauteur },
      { x1: xPotence, y1: C, x2: xd + largeurDroite, y2: C },
    ],
    virgule: virgule(o, 0, 0),
  };
}

function virgule(o: OperationPosee, x0: number, y0: number) {
  if (!o.virgule || o.virgule <= 0 || o.virgule >= o.colonnes) return null;
  return { x: x0 + (o.colonnes - o.virgule) * CASE_MM, y1: y0, y2: y0 + o.lignes * CASE_MM };
}

const COULEURS_RANG = ['#dbeafe', '#dcfce7', '#fee2e2']; // unités, dizaines, centaines
const COULEUR_DECIMALE = '#f3e8ff';

export function couleurColonne(o: OperationPosee, col: number): string | null {
  if (!o.couleurs) return null;
  const k = o.colonnes - 1 - col - (o.virgule ?? 0);
  return k < 0 ? COULEUR_DECIMALE : COULEURS_RANG[k % 3];
}

export const saisieValide = (ch: string) => /^[0-9]$/.test(ch);

/**
 * Caractère tapé au clavier physique dans une case d'un seul chiffre : la valeur du champ peut être
 * l'ancien chiffre plus le nouveau, avant ou après selon la position du curseur. '' = effacement.
 */
export function caractereSaisi(ancien: string, nouveau: string): string {
  if (nouveau === '') return '';
  if (ancien && nouveau.length > ancien.length) {
    if (nouveau.startsWith(ancien)) return nouveau.slice(ancien.length).slice(-1);
    if (nouveau.endsWith(ancien)) return nouveau.slice(0, nouveau.length - ancien.length).slice(-1);
  }
  return nouveau.slice(-1);
}

function tableau(o: OperationPosee, zone: Zone): string[] {
  return zone === 'case' ? o.cases : zone === 'retenue' ? o.retenues : zone === 'diviseur' ? o.diviseur : o.quotient;
}

export function valeurCellule(o: OperationPosee, zone: Zone, index: number): string {
  return tableau(o, zone)[index] ?? '';
}

export function ecrireCellule(o: OperationPosee, zone: Zone, index: number, valeur: string): OperationPosee {
  const t = tableau(o, zone).slice();
  t[index] = valeur;
  const champ = zone === 'case' ? 'cases' : zone === 'retenue' ? 'retenues' : zone;
  return { ...o, [champ]: t };
}

export const cle = (zone: Zone, index: number) => `${zone}:${index}`;

export function lireCle(k: string): { zone: Zone; index: number } {
  const [zone, index] = k.split(':');
  return { zone: zone as Zone, index: Number(index) };
}

export function voisin(o: OperationPosee, zone: Zone, index: number, dir: Direction): string | null {
  const C = o.colonnes;
  if (zone === 'case') {
    const r = Math.floor(index / C);
    const c = index % C;
    if (dir === 'gauche') return c > 0 ? cle('case', index - 1) : null;
    if (dir === 'droite') return c < C - 1 ? cle('case', index + 1) : null;
    if (dir === 'bas') return r < o.lignes - 1 ? cle('case', index + C) : null;
    if (r > 0) return cle('case', index - C);
    return o.retenues.length ? cle('retenue', c) : null;
  }
  const t = tableau(o, zone);
  if (dir === 'gauche') return index > 0 ? cle(zone, index - 1) : null;
  if (dir === 'droite') return index < t.length - 1 ? cle(zone, index + 1) : null;
  if (zone === 'retenue') return dir === 'bas' ? cle('case', index) : null;
  if (zone === 'diviseur') return dir === 'bas' && index < o.quotient.length ? cle('quotient', index) : null;
  return dir === 'haut' && index < o.diviseur.length ? cle('diviseur', index) : null;
}

/** On commence par les unités du premier nombre ; la division se lit de gauche à droite. */
export function cleDepart(o: OperationPosee): string {
  return o.operateur === '÷' ? cle('case', 0) : cle('case', o.colonnes - 1);
}

export function directionSaisie(o: OperationPosee, zone: Zone): Direction | null {
  if (zone === 'retenue') return null;
  if (zone === 'case' && o.operateur !== '÷') return 'gauche';
  return 'droite';
}

export function libelleCellule(o: OperationPosee, zone: Zone, index: number): string {
  if (zone === 'case') return `Ligne ${Math.floor(index / o.colonnes) + 1}, colonne ${(index % o.colonnes) + 1}`;
  if (zone === 'retenue') return `Retenue, colonne ${index + 1}`;
  return `${zone === 'diviseur' ? 'Diviseur' : 'Quotient'}, chiffre ${index + 1}`;
}

/** Lignes au-dessus de la barre (hors division) : l'élève recopie un nombre, il ne calcule pas. */
export function estLigneARecopier(o: OperationPosee, ligne: number): boolean {
  return o.operateur !== '÷' && ligne < lignesAvantBarre(o);
}

function remplacerLigne(o: OperationPosee, ligne: number, chiffres: string[]): OperationPosee {
  const C = o.colonnes;
  const rangee = Array<string>(C - chiffres.length).fill('').concat(chiffres);
  const cases = o.cases.slice();
  cases.splice(ligne * C, C, ...rangee);
  return { ...o, cases };
}

const chiffresDeLigne = (o: OperationPosee, ligne: number) =>
  o.cases.slice(ligne * o.colonnes, (ligne + 1) * o.colonnes).filter(v => v !== '');

/** Saisie « calculatrice » : chiffres tapés dans l'ordre de lecture, nombre calé à droite (unités sous unités). */
export function taperCalculatrice(o: OperationPosee, ligne: number, chiffre: string): OperationPosee {
  const chiffres = chiffresDeLigne(o, ligne);
  if (!saisieValide(chiffre) || chiffres.length >= o.colonnes) return o;
  return remplacerLigne(o, ligne, [...chiffres, chiffre]);
}

export function effacerCalculatrice(o: OperationPosee, ligne: number): OperationPosee {
  return remplacerLigne(o, ligne, chiffresDeLigne(o, ligne).slice(0, -1));
}

/** Touche « Nombre suivant » : unités de la ligne suivante (début de ligne pour la division). */
export function ligneSuivante(o: OperationPosee, k: string): string | null {
  const { zone, index } = lireCle(k);
  const C = o.colonnes;
  const debut = (r: number) => (r >= o.lignes ? null : cle('case', o.operateur === '÷' ? r * C : r * C + C - 1));
  if (zone === 'case') return debut(Math.floor(index / C) + 1);
  if (zone === 'retenue') return debut(0);
  if (zone === 'diviseur') return o.quotient.length ? cle('quotient', 0) : null;
  return null;
}

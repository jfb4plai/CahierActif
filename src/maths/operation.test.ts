import { describe, it, expect } from 'vitest';
import {
  CASE_MM, RETENUE_MM, creerOperation, geometrieOperation, couleurColonne, operateursPour,
  decimalesPermises, chiffresDiviseurMax, voisin, ecrireCellule, valeurCellule, saisieValide,
  cleDepart, directionSaisie, caractereSaisi, type ParamsOperation,
} from './operation';

const params = (p: Partial<ParamsOperation> = {}): ParamsOperation => ({
  operateur: '+', colonnes: 3, lignes: 3, virgule: null, chiffresDiviseur: 1, couleurs: true, ...p,
});

describe('operation', () => {
  it('opérateurs, décimales et diviseur selon le niveau', () => {
    expect(operateursPour('p1p2')).toEqual(['+', '-']);
    expect(operateursPour('p3p6')).toEqual(['+', '-', '×', '÷']);
    expect(decimalesPermises('p3p6')).toBe(false);
    expect(decimalesPermises('secondaire')).toBe(true);
    expect(chiffresDiviseurMax('p3p6')).toBe(1);
    expect(chiffresDiviseurMax('secondaire')).toBe(3);
  });

  it('creerOperation : cases vides, retenues sauf pour ÷', () => {
    const o = creerOperation(10, 20, params(), '#000000');
    expect(o.cases).toHaveLength(9);
    expect(o.retenues).toHaveLength(3);
    expect(o.diviseur).toEqual([]);
    const d = creerOperation(0, 0, params({ operateur: '÷', colonnes: 4, chiffresDiviseur: 2 }), '#000000');
    expect(d.retenues).toEqual([]);
    expect(d.diviseur).toHaveLength(2);
    expect(d.quotient).toHaveLength(4);
  });

  it('géométrie addition 3 × 3 : colonne du signe, retenues, barre avant le résultat', () => {
    const g = geometrieOperation(creerOperation(0, 0, params(), '#000000'));
    expect(g.largeur).toBe(CASE_MM * 4);
    expect(g.hauteur).toBe(RETENUE_MM + 3 * CASE_MM);
    expect(g.cellules.filter(c => c.zone === 'retenue')).toHaveLength(3);
    expect(g.cellules.filter(c => c.zone === 'case')).toHaveLength(9);
    expect(g.barres).toEqual([{ x1: 0, y1: RETENUE_MM + 2 * CASE_MM, x2: 40, y2: RETENUE_MM + 2 * CASE_MM }]);
    expect(g.signe).toEqual({ x: CASE_MM / 2, y: RETENUE_MM + 1.5 * CASE_MM });
    const premiere = g.cellules.find(c => c.zone === 'case' && c.index === 0)!;
    expect([premiere.x, premiere.y]).toEqual([CASE_MM, RETENUE_MM]);
  });

  it('multiplication : la barre suit toujours les deux premières lignes', () => {
    const g = geometrieOperation(creerOperation(0, 0, params({ operateur: '×', lignes: 5 }), '#000000'));
    expect(g.barres[0].y1).toBe(RETENUE_MM + 2 * CASE_MM);
  });

  it('division : potence, diviseur en haut à droite, quotient dessous', () => {
    const o = creerOperation(0, 0, params({ operateur: '÷', colonnes: 4, lignes: 3, chiffresDiviseur: 2 }), '#000000');
    const g = geometrieOperation(o);
    expect(g.signe).toBeNull();
    expect(g.cellules.filter(c => c.zone === 'case')).toHaveLength(12);
    const d0 = g.cellules.find(c => c.zone === 'diviseur' && c.index === 0)!;
    const q0 = g.cellules.find(c => c.zone === 'quotient' && c.index === 0)!;
    expect(d0.y).toBe(0);
    expect(q0.y).toBe(CASE_MM);
    expect(d0.x).toBe(q0.x);
    expect(g.largeur).toBe(4 * CASE_MM + 2 + 4 * CASE_MM);
    expect(g.hauteur).toBe(3 * CASE_MM);
    expect(g.barres).toHaveLength(2);
  });

  it('virgule : trait entre partie entière et décimales', () => {
    const g = geometrieOperation(creerOperation(0, 0, params({ colonnes: 4, virgule: 1 }), '#000000'));
    expect(g.virgule).toEqual({ x: CASE_MM + 3 * CASE_MM, y1: RETENUE_MM, y2: RETENUE_MM + 3 * CASE_MM });
  });

  it('couleurs des colonnes depuis la droite de la partie entière', () => {
    const o = creerOperation(0, 0, params({ colonnes: 5, virgule: 1 }), '#000000');
    // k = rang depuis les unités : 3 (milliers → bleu), 2 (centaines → rouge), 1 (dizaines → vert), 0 (unités → bleu), puis décimale
    expect([0, 1, 2, 3, 4].map(c => couleurColonne(o, c))).toEqual(['#dbeafe', '#fee2e2', '#dcfce7', '#dbeafe', '#f3e8ff']);
    expect(couleurColonne({ ...o, couleurs: false }, 0)).toBeNull();
  });

  it('saisie : un seul chiffre accepté', () => {
    expect(saisieValide('7')).toBe(true);
    expect(saisieValide('a')).toBe(false);
    expect(saisieValide('12')).toBe(false);
  });

  it('écrire / lire une cellule sans muter l’objet', () => {
    const o = creerOperation(0, 0, params(), '#000000');
    const o2 = ecrireCellule(o, 'case', 4, '5');
    expect(valeurCellule(o2, 'case', 4)).toBe('5');
    expect(valeurCellule(o, 'case', 4)).toBe('');
    expect(valeurCellule(ecrireCellule(o, 'retenue', 1, '1'), 'retenue', 1)).toBe('1');
  });

  it('navigation entre cellules', () => {
    const o = creerOperation(0, 0, params(), '#000000'); // 3 × 3
    expect(voisin(o, 'case', 4, 'gauche')).toBe('case:3');
    expect(voisin(o, 'case', 3, 'gauche')).toBeNull();
    expect(voisin(o, 'case', 1, 'haut')).toBe('retenue:1');
    expect(voisin(o, 'retenue', 1, 'bas')).toBe('case:1');
    expect(voisin(o, 'case', 8, 'bas')).toBeNull();
    const d = creerOperation(0, 0, params({ operateur: '÷', chiffresDiviseur: 2 }), '#000000');
    expect(voisin(d, 'diviseur', 0, 'bas')).toBe('quotient:0');
    expect(voisin(d, 'quotient', 1, 'haut')).toBe('diviseur:1');
    expect(voisin(d, 'quotient', 2, 'haut')).toBeNull();
  });

  it('case de départ et sens de saisie', () => {
    const o = creerOperation(0, 0, params(), '#000000');
    expect(cleDepart(o)).toBe('case:2');
    expect(directionSaisie(o, 'case')).toBe('gauche');
    expect(directionSaisie(o, 'retenue')).toBeNull();
    const d = creerOperation(0, 0, params({ operateur: '÷' }), '#000000');
    expect(cleDepart(d)).toBe('case:0');
    expect(directionSaisie(d, 'case')).toBe('droite');
  });

  it('caractère tapé au clavier physique dans une case déjà remplie', () => {
    expect(caractereSaisi('', '4')).toBe('4');
    expect(caractereSaisi('5', '53')).toBe('3'); // curseur après l'ancien chiffre
    expect(caractereSaisi('5', '35')).toBe('3'); // curseur avant l'ancien chiffre
    expect(caractereSaisi('5', '3')).toBe('3'); // chiffre sélectionné puis remplacé
    expect(caractereSaisi('5', '55')).toBe('5');
    expect(caractereSaisi('5', '')).toBe('');
  });
});

import { ptVersMm } from '../lib/units';
import { geometrieFraction } from '../maths/fraction';
import { geometrieOperation } from '../maths/operation';
import { geometrieRepere } from '../maths/repere';
import type { Objet, Texte, Trait } from './types';

export type Boite = { x: number; y: number; largeur: number; hauteur: number };
export type ObjetBoite = Exclude<Objet, Trait>;

/** Hauteur approximative : une ligne par saut de ligne explicite, interligne 1,5. */
export function hauteurTexte(t: Texte): number {
  const lignes = Math.max(1, t.texte.split('\n').length);
  return lignes * ptVersMm(t.taillePt) * 1.5;
}

export function boiteObjet(o: ObjetBoite): Boite {
  switch (o.type) {
    case 'texte':
      return { x: o.x, y: o.y, largeur: o.largeur, hauteur: hauteurTexte(o) };
    case 'operation': {
      const g = geometrieOperation(o);
      return { x: o.x, y: o.y, largeur: g.largeur, hauteur: g.hauteur };
    }
    case 'fraction': {
      const g = geometrieFraction(o);
      return { x: o.x, y: o.y, largeur: g.largeur, hauteur: g.hauteur };
    }
    case 'expression':
      return { x: o.x, y: o.y, largeur: Math.max(5, o.largeurMm), hauteur: Math.max(5, o.hauteurMm) };
    case 'repere': {
      const g = geometrieRepere(o);
      return { x: o.x, y: o.y, largeur: g.largeur, hauteur: g.hauteur };
    }
  }
}

import { nouvelId } from '../model/types';
import type { PointRepere, Repere } from '../model/types';

export const MARGE_MM = 6; // place des étiquettes autour du quadrillage
export const UNITES_MM = [5, 10, 20];
const LARGEUR_MAX_MM = 180;
const HAUTEUR_MAX_MM = 260;

export type ParamsRepere = { xmin: number; xmax: number; ymin: number; ymax: number; uniteMm: number };
export type Graduation = { valeur: number; position: number }; // position absolue en mm (x pour l'axe X, y pour l'axe Y)
export type GeometrieRepere = {
  largeur: number;
  hauteur: number;
  origine: { x: number; y: number }; // absolue, mm
  graduationsX: Graduation[];
  graduationsY: Graduation[];
};

export function parametresValides(p: ParamsRepere): string | null {
  const nombres = [p.xmin, p.xmax, p.ymin, p.ymax];
  if (!nombres.every(Number.isInteger)) return 'Les bornes doivent être des nombres entiers.';
  if (!(p.xmin <= 0 && 0 <= p.xmax && p.ymin <= 0 && 0 <= p.ymax)) return 'Chaque axe doit contenir 0 (minimum ≤ 0 ≤ maximum).';
  if (p.xmax - p.xmin < 1 || p.ymax - p.ymin < 1) return 'Chaque axe doit couvrir au moins une unité.';
  if (!UNITES_MM.includes(p.uniteMm)) return 'Choisissez une unité de 5 mm, 1 cm ou 2 cm.';
  if ((p.xmax - p.xmin) * p.uniteMm > LARGEUR_MAX_MM || (p.ymax - p.ymin) * p.uniteMm > HAUTEUR_MAX_MM) {
    return 'Le repère dépasse la page : réduisez l’étendue des axes ou l’unité.';
  }
  return null;
}

export function creerRepere(x: number, y: number, p: ParamsRepere, couleur: string): Repere {
  return { id: nouvelId(), type: 'repere', x, y, ...p, points: [], couleur };
}

export function versMm(r: Repere, ux: number, uy: number): { x: number; y: number } {
  return { x: r.x + MARGE_MM + (ux - r.xmin) * r.uniteMm, y: r.y + MARGE_MM + (r.ymax - uy) * r.uniteMm };
}

export function versUnites(r: Repere, xmm: number, ymm: number): { x: number; y: number } {
  return { x: r.xmin + (xmm - r.x - MARGE_MM) / r.uniteMm, y: r.ymax - (ymm - r.y - MARGE_MM) / r.uniteMm };
}

export function geometrieRepere(r: Repere): GeometrieRepere {
  const graduationsX: Graduation[] = [];
  for (let v = r.xmin; v <= r.xmax; v++) graduationsX.push({ valeur: v, position: versMm(r, v, 0).x });
  const graduationsY: Graduation[] = [];
  for (let v = r.ymin; v <= r.ymax; v++) graduationsY.push({ valeur: v, position: versMm(r, 0, v).y });
  return {
    largeur: (r.xmax - r.xmin) * r.uniteMm + 2 * MARGE_MM,
    hauteur: (r.ymax - r.ymin) * r.uniteMm + 2 * MARGE_MM,
    origine: versMm(r, 0, 0),
    graduationsX,
    graduationsY,
  };
}

const arrondirDemi = (v: number) => Math.round(v * 2) / 2;

export function nomSuivant(points: PointRepere[]): string {
  const pris = new Set(points.map(p => p.nom));
  for (let tour = 0; ; tour++) {
    for (let i = 0; i < 26; i++) {
      const nom = String.fromCharCode(65 + i) + (tour === 0 ? '' : String(tour));
      if (!pris.has(nom)) return nom;
    }
  }
}

/** Toucher hors du quadrillage ou sur un point existant : repère inchangé (même référence). */
export function ajouterPoint(r: Repere, xmm: number, ymm: number): Repere {
  const u = versUnites(r, xmm, ymm);
  const x = arrondirDemi(u.x);
  const y = arrondirDemi(u.y);
  if (x < r.xmin || x > r.xmax || y < r.ymin || y > r.ymax) return r;
  if (r.points.some(p => p.x === x && p.y === y)) return r;
  return { ...r, points: [...r.points, { nom: nomSuivant(r.points), x, y }] };
}

export function supprimerPoint(r: Repere, nom: string): Repere {
  return { ...r, points: r.points.filter(p => p.nom !== nom) };
}

export function formatNombre(v: number): string {
  return String(v).replace('.', ',');
}

export function etiquettePoint(p: PointRepere): string {
  return `${p.nom}(${formatNombre(p.x)} ; ${formatNombre(p.y)})`;
}

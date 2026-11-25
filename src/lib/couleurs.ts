export function hexVersRgb01(hex: string): { r: number; g: number; b: number } {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return { r: 0, g: 0, b: 0 };
  return { r: parseInt(m[1], 16) / 255, g: parseInt(m[2], 16) / 255, b: parseInt(m[3], 16) / 255 };
}

/** Six couleurs de surligneur : claires pour que le texte reste lisible dessous. */
export const COULEURS_SURLIGNEUR = [
  { hex: '#facc15', nom: 'Jaune' },
  { hex: '#4ade80', nom: 'Vert' },
  { hex: '#f472b6', nom: 'Rose' },
  { hex: '#38bdf8', nom: 'Bleu' },
  { hex: '#fb923c', nom: 'Orange' },
  { hex: '#c084fc', nom: 'Violet' },
];
export const SURLIGNEUR_OPACITE = 0.4;
export const SURLIGNEUR_EPAISSEUR_MM = 5;

import { describe, expect, it } from 'vitest';
import { PALETTE_COURS, SANS_COULEUR, couleurCours, premiereCouleurLibre } from './couleursCours';

const d = (id: string, couleur?: string) => ({ id, nom: id, cree: 0, ...(couleur ? { couleur } : {}) });

describe('couleurs des cours', () => {
  it('l’Exemple est en jaune pâle par défaut', () => {
    expect(couleurCours(d('defaut-exemple'))?.id).toBe('jaune');
    expect(couleurCours(d('defaut-exemple'))?.fond).toBe('#fef9c3');
  });
  it('les six cours par défaut ont chacun une couleur différente', () => {
    const ids = [0, 1, 2, 3, 4, 5, 'exemple'].map(i => couleurCours(d(`defaut-${i}`))?.id);
    expect(new Set(ids).size).toBe(7);
    expect(ids.every(Boolean)).toBe(true);
  });
  it('un cours créé par l’élève est blanc tant qu’il n’a pas de couleur', () => {
    expect(couleurCours(d('abc-123'))).toBeUndefined();
  });
  it('la couleur choisie l’emporte sur la couleur par défaut', () => {
    expect(couleurCours(d('defaut-0', 'rose'))?.id).toBe('rose');
  });
  it('« Aucune » retire même la couleur par défaut', () => {
    expect(couleurCours(d('defaut-exemple', SANS_COULEUR))).toBeUndefined();
  });
  it('une couleur inconnue est ignorée', () => {
    expect(couleurCours(d('x', 'fluo'))).toBeUndefined();
  });
  it('propose une couleur encore libre', () => {
    const six = [0, 1, 2, 3, 4, 5].map(i => d(`defaut-${i}`));
    expect(premiereCouleurLibre(six)).toBe('jaune'); // seule la couleur de l’Exemple reste libre
    expect(premiereCouleurLibre([...six, d('defaut-exemple')])).toBe(SANS_COULEUR);
  });
  it('contraste : texte noir sur chaque fond au moins 12 : 1', () => {
    const lum = (hex: string) => {
      const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    };
    for (const c of PALETTE_COURS) expect((lum(c.fond) + 0.05) / (lum('#1a1814') + 0.05)).toBeGreaterThan(12);
  });
});

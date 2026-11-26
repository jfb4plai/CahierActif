import { describe, expect, it } from 'vitest';
import { titreParDefaut, verifierTitre, TITRE_MAX } from './titres';

describe('titres', () => {
  it('titre par défaut avec la date et l’heure', () => {
    expect(titreParDefaut('Page vierge', new Date(2026, 10, 26, 7, 5))).toBe('Page vierge, 26/11 à 07:05');
  });
  it('nettoie les espaces', () => {
    expect(verifierTitre('  Maths   du  jeudi ')).toEqual({ titre: 'Maths du jeudi' });
  });
  it('refuse un nom vide ou trop long', () => {
    expect(verifierTitre('   ')).toHaveProperty('erreur');
    expect(verifierTitre('a'.repeat(TITRE_MAX + 1))).toHaveProperty('erreur');
    expect(verifierTitre('a'.repeat(TITRE_MAX))).toEqual({ titre: 'a'.repeat(TITRE_MAX) });
  });
});

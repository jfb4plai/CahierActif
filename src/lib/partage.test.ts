import { describe, it, expect } from 'vitest';
import { nomFichier } from './partage';

describe('nomFichier', () => {
  it('retire les caractères interdits et garde les accents', () => {
    expect(nomFichier('Fiche : géométrie / ex. 3?')).toBe('Fiche - géométrie - ex. 3');
  });
  it('titre vide → cahier', () => {
    expect(nomFichier('  ')).toBe('cahier');
  });
  it('tronque à 80 caractères', () => {
    expect(nomFichier('a'.repeat(200))).toHaveLength(80);
  });
});

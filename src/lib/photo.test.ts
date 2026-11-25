import { describe, it, expect } from 'vitest';
import { dimensionsReduites, taillePageDepuisImage, PAGE_COTE_LONG_MM } from './photo';

describe('dimensionsReduites', () => {
  it('petite image : inchangée', () => {
    expect(dimensionsReduites(800, 1200)).toEqual({ largeur: 800, hauteur: 1200 });
  });
  it('grande photo : grand côté ramené à 2200 px, proportions gardées', () => {
    expect(dimensionsReduites(4000, 3000)).toEqual({ largeur: 2200, hauteur: 1650 });
    expect(dimensionsReduites(3000, 4000)).toEqual({ largeur: 1650, hauteur: 2200 });
  });
  it('maximum explicite', () => {
    expect(dimensionsReduites(1000, 500, 500)).toEqual({ largeur: 500, hauteur: 250 });
  });
});

describe('taillePageDepuisImage', () => {
  it('portrait : le grand côté (hauteur) fait 297 mm', () => {
    const t = taillePageDepuisImage(1500, 2000);
    expect(t.hauteurMm).toBe(PAGE_COTE_LONG_MM);
    expect(t.largeurMm).toBeCloseTo(222.75);
  });
  it('paysage : le grand côté (largeur) fait 297 mm', () => {
    const t = taillePageDepuisImage(2000, 1500);
    expect(t.largeurMm).toBe(PAGE_COTE_LONG_MM);
    expect(t.hauteurMm).toBeCloseTo(222.75);
  });
  it('dimensions invalides : A4 portrait', () => {
    expect(taillePageDepuisImage(0, 0)).toEqual({ largeurMm: 210, hauteurMm: 297 });
  });
});

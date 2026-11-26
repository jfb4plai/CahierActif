import { describe, it, expect } from 'vitest';
import { choisirResultat, libelleDetection, titreFile } from './fileRecadrage';
import type { ImageSource, TaillePage } from '../model/types';

const img = (n: number): ImageSource => ({ mime: 'image/jpeg', data: new ArrayBuffer(n) });
const t = (l: number, h: number): TaillePage => ({ largeurMm: l, hauteurMm: h });

describe('choisirResultat', () => {
  it('« Garder tel quel » conserve image et taille d’origine', () => {
    const r = choisirResultat({ image: img(1), taille: t(210, 297) }, null);
    expect(r.image.data.byteLength).toBe(1);
    expect(r.taille).toEqual(t(210, 297));
  });
  it('« Appliquer » remplace image et taille', () => {
    const r = choisirResultat({ image: img(1), taille: t(210, 297) }, { image: img(5), taille: t(297, 210) });
    expect(r.image.data.byteLength).toBe(5);
    expect(r.taille).toEqual(t(297, 210));
  });
});

describe('textes de la file', () => {
  it('titre : photo 2 sur 5', () => expect(titreFile(1, 5)).toBe('Photo 2 sur 5'));
  it('titre : une seule photo', () => expect(titreFile(0, 1)).toBe('Photo à recadrer'));
  it('détection réussie ou non', () => {
    expect(libelleDetection(true)).toMatch(/détectée/);
    expect(libelleDetection(false)).toMatch(/non détectée/);
  });
});

import { describe, it, expect } from 'vitest';
import { hexVersRgb01 } from './couleurs';

describe('hexVersRgb01', () => {
  it('convertit #rrggbb en composantes 0..1', () => {
    expect(hexVersRgb01('#ff8000')).toEqual({ r: 1, g: 128 / 255, b: 0 });
  });
  it('valeur invalide → noir', () => {
    expect(hexVersRgb01('rouge')).toEqual({ r: 0, g: 0, b: 0 });
  });
});

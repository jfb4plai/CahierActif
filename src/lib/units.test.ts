import { describe, it, expect } from 'vitest';
import { pxParMm, ptVersMm, mmVersPt, MM_PAR_PT, ratioPixelsMax, PIXELS_CANVAS_MAX } from './units';

describe('units', () => {
  it('à zoom 1, 25,4 mm = 96 px CSS', () => {
    expect(pxParMm(1) * 25.4).toBeCloseTo(96, 6);
  });
  it('le zoom multiplie linéairement', () => {
    expect(pxParMm(2)).toBeCloseTo(2 * pxParMm(1), 9);
  });
  it('A4 : 595,28 pt = 210 mm', () => {
    expect(ptVersMm(595.28)).toBeCloseTo(210, 1);
  });
  it('mm → pt → mm est une identité', () => {
    expect(ptVersMm(mmVersPt(42.5))).toBeCloseTo(42.5, 9);
  });
  it('1 pt = 25,4/72 mm', () => {
    expect(MM_PAR_PT).toBeCloseTo(0.352777, 5);
  });
});

describe('ratioPixelsMax', () => {
  it('garde le ratio de l’écran quand le canvas est petit', () => {
    expect(ratioPixelsMax(794, 1123, 2)).toBe(2);
  });
  it('réduit le ratio pour rester sous la limite (A4 à 300 %, écran Retina)', () => {
    const w = 2381;
    const h = 3368;
    const r = ratioPixelsMax(w, h, 2);
    expect(r).toBeLessThan(2);
    expect(w * r * (h * r)).toBeLessThanOrEqual(PIXELS_CANVAS_MAX + 1e-6);
    expect(w * r * (h * r)).toBeGreaterThan(PIXELS_CANVAS_MAX * 0.999);
  });
  it('surface nulle : ratio inchangé', () => {
    expect(ratioPixelsMax(0, 100, 3)).toBe(3);
  });
});

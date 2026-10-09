import { describe, it, expect } from 'vitest';
import { pxParMm, ptVersMm, mmVersPt, MM_PAR_PT } from './units';

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

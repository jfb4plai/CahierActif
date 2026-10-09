import { describe, it, expect } from 'vitest';
import { ptVersMm } from '../lib/units';
import { latexVersSvg, dimensionsMm } from './expression';

describe('latexVersSvg', () => {
  it('rend un SVG coloré, sans currentColor, avec dimensions en em', async () => {
    const r = await latexVersSvg(String.raw`\frac{3}{4}+x^2`, '#1d4ed8');
    expect(r.svg.startsWith('<svg')).toBe(true);
    expect(r.svg).toContain('#1d4ed8');
    expect(r.svg).not.toContain('currentColor');
    expect(r.erreur).toBe(false);
    expect(r.largeurEm).toBeGreaterThan(1);
    expect(r.hauteurEm).toBeGreaterThan(0.5);
  });

  it('symboles du clavier simplifié', async () => {
    const r = await latexVersSvg(String.raw`\le \ge \neq \pi \sqrt{2} \times \div`, '#000000');
    expect(r.erreur).toBe(false);
  });

  it('LaTeX incomplet : erreur signalée, pas d’exception', async () => {
    const r = await latexVersSvg(String.raw`\frac{`, '#000000');
    expect(r.erreur).toBe(true);
  });

  it('chaîne vide : pas de SVG', async () => {
    expect(await latexVersSvg('  ', '#000000')).toEqual({ svg: '', largeurEm: 0, hauteurEm: 0, erreur: false });
  });

  it('dimensions en mm', () => {
    const d = dimensionsMm({ svg: '', largeurEm: 2, hauteurEm: 1, erreur: false }, 16);
    expect(d.largeurMm).toBeCloseTo(2 * ptVersMm(16), 6);
    expect(d.hauteurMm).toBeCloseTo(ptVersMm(16), 6);
  });
});

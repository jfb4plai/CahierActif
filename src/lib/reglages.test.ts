import { describe, it, expect } from 'vitest';
import { lireReglages, ecrireReglages } from './reglages';

function memoire(): Storage {
  const m = new Map<string, string>();
  return {
    getItem: k => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: k => void m.delete(k),
    clear: () => m.clear(),
    key: i => Array.from(m.keys())[i] ?? null,
    get length() { return m.size; },
  };
}

describe('reglages', () => {
  it('rien d’enregistré → null', () => {
    expect(lireReglages(memoire())).toBeNull();
  });
  it('aller-retour', () => {
    const s = memoire();
    ecrireReglages({ niveau: 'secondaire', modeEntree: 'stylet' }, s);
    expect(lireReglages(s)).toEqual({ niveau: 'secondaire', modeEntree: 'stylet' });
  });
  it('valeur corrompue → null', () => {
    const s = memoire();
    s.setItem('cahieractif.reglages', '{"niveau":"lycee","modeEntree":"stylet"}');
    expect(lireReglages(s)).toBeNull();
    s.setItem('cahieractif.reglages', 'pas du json');
    expect(lireReglages(s)).toBeNull();
  });
  it('stockage indisponible → null sans exception', () => {
    expect(lireReglages(null)).toBeNull();
    expect(() => ecrireReglages({ niveau: 'p1p2', modeEntree: 'souris' }, null)).not.toThrow();
  });
});

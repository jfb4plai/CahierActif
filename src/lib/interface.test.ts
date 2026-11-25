import { describe, it, expect } from 'vitest';
import { ecrireInterface, INTERFACE_DEFAUT, lireInterface } from './interface';

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

describe('interface', () => {
  it('rien d’enregistré : en-tête replié, colonne dépliée', () => {
    expect(lireInterface(memoire())).toEqual({ enteteDeplie: false, colonneRepliee: false });
    expect(INTERFACE_DEFAUT.enteteDeplie).toBe(false);
  });
  it('aller-retour', () => {
    const s = memoire();
    ecrireInterface({ enteteDeplie: true, colonneRepliee: true }, s);
    expect(lireInterface(s)).toEqual({ enteteDeplie: true, colonneRepliee: true });
  });
  it('valeur corrompue ou partielle : défauts pour ce qui manque', () => {
    const s = memoire();
    s.setItem('cahieractif.interface', 'pas du json');
    expect(lireInterface(s)).toEqual(INTERFACE_DEFAUT);
    s.setItem('cahieractif.interface', '{"colonneRepliee":true,"enteteDeplie":"oui"}');
    expect(lireInterface(s)).toEqual({ enteteDeplie: false, colonneRepliee: true });
  });
  it('stockage indisponible : sans exception', () => {
    expect(lireInterface(null)).toEqual(INTERFACE_DEFAUT);
    expect(() => ecrireInterface({ enteteDeplie: true, colonneRepliee: true }, null)).not.toThrow();
  });
});

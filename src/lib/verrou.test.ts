import { describe, expect, it } from 'vitest';
import { codeValide, creerVerrou, ecrireVerrou, lireVerrou, verifierCode } from './verrou';

const memoire = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
};

describe('verrou', () => {
  it('le code a exactement 4 chiffres', () => {
    expect(codeValide('1234')).toBe(true);
    for (const c of ['123', '12345', 'abcd', '12 4', '']) expect(codeValide(c)).toBe(false);
  });
  it('vérifie le bon code et refuse les autres', async () => {
    const v = await creerVerrou('4821');
    expect(await verifierCode('4821', v)).toBe(true);
    expect(await verifierCode('4822', v)).toBe(false);
    expect(await verifierCode('48', v)).toBe(false);
  });
  it('ne garde pas le code en clair', async () => {
    const v = await creerVerrou('4821');
    expect(JSON.stringify(v)).not.toContain('4821');
  });
  it('deux verrous du même code ont des empreintes différentes (sel)', async () => {
    const a = await creerVerrou('1111'), b = await creerVerrou('1111');
    expect(a.empreinte).not.toBe(b.empreinte);
  });
  it('refuse de créer un code invalide', async () => {
    await expect(creerVerrou('12')).rejects.toThrow();
  });
  it('enregistre, relit et efface', async () => {
    const s = memoire();
    expect(lireVerrou(s)).toBeNull();
    const v = await creerVerrou('0000');
    ecrireVerrou(v, s);
    expect(lireVerrou(s)).toEqual(v);
    ecrireVerrou(null, s);
    expect(lireVerrou(s)).toBeNull();
  });
  it('valeur corrompue : pas de verrou', () => {
    const s = { getItem: () => 'pas du json' };
    expect(lireVerrou(s)).toBeNull();
    expect(lireVerrou({ getItem: () => '{"sel":1}' })).toBeNull();
  });
});

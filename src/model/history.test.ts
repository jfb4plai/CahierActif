import { describe, it, expect } from 'vitest';
import { creer, pousser, annuler, retablir, peutAnnuler, peutRetablir, LIMITE } from './history';

describe('history', () => {
  it('pousser puis annuler revient à l’état précédent', () => {
    let h = creer(1);
    h = pousser(h, 2);
    h = pousser(h, 3);
    h = annuler(h);
    expect(h.present).toBe(2);
    expect(peutRetablir(h)).toBe(true);
  });

  it('retablir rejoue', () => {
    let h = pousser(pousser(creer(1), 2), 3);
    h = retablir(annuler(annuler(h)));
    expect(h.present).toBe(2);
  });

  it('pousser après annuler vide le futur', () => {
    let h = pousser(pousser(creer(1), 2), 3);
    h = pousser(annuler(h), 9);
    expect(h.present).toBe(9);
    expect(peutRetablir(h)).toBe(false);
  });

  it('annuler sans passé ne change rien', () => {
    const h = creer('a');
    expect(annuler(h)).toBe(h);
    expect(peutAnnuler(h)).toBe(false);
  });

  it('pousser la même référence est ignoré', () => {
    const o = { a: 1 };
    const h = creer(o);
    expect(pousser(h, o)).toBe(h);
  });

  it('le passé est limité', () => {
    let h = creer(0);
    for (let i = 1; i <= LIMITE + 50; i++) h = pousser(h, i);
    expect(h.passe).toHaveLength(LIMITE);
  });
});

import { describe, it, expect } from 'vitest';
import { decider, ETAT_INITIAL } from './pointerPolicy';

describe('pointerPolicy', () => {
  it('mode souris : tout trace', () => {
    for (const t of ['mouse', 'pen', 'touch']) expect(decider('souris', ETAT_INITIAL, t).tracer).toBe(true);
  });

  it('mode stylet : le doigt trace tant qu’aucun stylet n’a été vu', () => {
    expect(decider('stylet', ETAT_INITIAL, 'touch').tracer).toBe(true);
  });

  it('mode stylet : après un stylet, le doigt ne trace plus', () => {
    const { etat } = decider('stylet', ETAT_INITIAL, 'pen');
    expect(etat.styletVu).toBe(true);
    expect(decider('stylet', etat, 'touch').tracer).toBe(false);
    expect(decider('stylet', etat, 'pen').tracer).toBe(true);
    expect(decider('stylet', etat, 'mouse').tracer).toBe(true);
  });

  it('ne modifie pas l’état d’entrée', () => {
    decider('stylet', ETAT_INITIAL, 'pen');
    expect(ETAT_INITIAL.styletVu).toBe(false);
  });
});

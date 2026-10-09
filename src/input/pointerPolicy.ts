import type { ModeEntree } from '../model/types';

export type EtatStylet = { readonly styletVu: boolean };
export const ETAT_INITIAL: EtatStylet = Object.freeze({ styletVu: false });

/** Rejet de la paume : dès qu'un stylet a tracé, le doigt sert à naviguer, plus à écrire. */
export function decider(mode: ModeEntree, etat: EtatStylet, pointerType: string): { tracer: boolean; etat: EtatStylet } {
  if (mode === 'souris') return { tracer: true, etat };
  if (pointerType === 'pen') return { tracer: true, etat: etat.styletVu ? etat : { styletVu: true } };
  if (pointerType === 'touch') return { tracer: !etat.styletVu, etat };
  return { tracer: true, etat };
}

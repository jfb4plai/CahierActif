export type Historique<T> = { passe: T[]; present: T; futur: T[] };

export const LIMITE = 200;

export function creer<T>(present: T): Historique<T> {
  return { passe: [], present, futur: [] };
}

export function pousser<T>(h: Historique<T>, suivant: T): Historique<T> {
  if (suivant === h.present) return h;
  return { passe: [...h.passe, h.present].slice(-LIMITE), present: suivant, futur: [] };
}

export function annuler<T>(h: Historique<T>): Historique<T> {
  if (h.passe.length === 0) return h;
  return { passe: h.passe.slice(0, -1), present: h.passe[h.passe.length - 1], futur: [h.present, ...h.futur] };
}

export function retablir<T>(h: Historique<T>): Historique<T> {
  if (h.futur.length === 0) return h;
  return { passe: [...h.passe, h.present], present: h.futur[0], futur: h.futur.slice(1) };
}

export const peutAnnuler = <T>(h: Historique<T>) => h.passe.length > 0;
export const peutRetablir = <T>(h: Historique<T>) => h.futur.length > 0;

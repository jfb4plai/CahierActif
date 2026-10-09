import type { ObjetMaths } from '../model/types';

/** Un objet vide à la fermeture de son éditeur n'est pas conservé. */
export function estVide(o: ObjetMaths): boolean {
  if (o.type === 'fraction') return !o.numerateur.trim() && !o.denominateur.trim();
  if (o.type === 'expression') return !o.latex.trim();
  return false;
}

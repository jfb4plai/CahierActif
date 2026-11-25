import { boiteObjet, type Boite } from './boites';
import { formeContient } from './formes';
import { objetTouche } from './gomme';
import type { Objet, Point, Trait } from './types';

/** Boîte de n'importe quel objet (un trait : ses points, élargis de son épaisseur). */
export function boiteDe(o: Objet): Boite {
  if (o.type !== 'trait') return boiteObjet(o);
  return boiteTrait(o);
}

function boiteTrait(t: Trait): Boite {
  const xs = t.points.map(q => q.x);
  const ys = t.points.map(q => q.y);
  const m = t.epaisseur / 2;
  const x = Math.min(...xs) - m;
  const y = Math.min(...ys) - m;
  return { x, y, largeur: Math.max(...xs) + m - x, hauteur: Math.max(...ys) + m - y };
}

/**
 * Objet à choisir quand on touche la page en `q` (outil Sélectionner).
 * Ordre : les objets du dessus d'abord ; un surligneur ne masque jamais ce qui est dessous ;
 * en dernier recours, l'intérieur d'une forme (le contour seul est difficile à viser).
 */
export function objetSous(objets: Objet[], q: Point, rayon = 2): Objet | undefined {
  const dessus = [...objets].reverse();
  const touche = (o: Objet) => objetTouche(o, q, rayon);
  return (
    dessus.find(o => !(o.type === 'trait' && o.surligneur) && touche(o)) ??
    dessus.find(o => o.type === 'trait' && o.surligneur && touche(o)) ??
    dessus.find(o => o.type === 'forme' && formeContient(o, q, 0))
  );
}

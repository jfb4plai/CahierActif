import { Group, Line } from 'react-konva';
import { droiteSurPage } from '../model/droites';
import type { Droite } from '../model/types';

const DEMI_CROIX = 1.2; // mm

/** Droite prolongée jusqu'aux bords de la page, avec une croix sur chacun des deux points. */
export function DroiteVue({ o, largeur, hauteur }: { o: Droite; largeur: number; hauteur: number }) {
  const s = droiteSurPage(o, largeur, hauteur);
  return (
    <Group>
      {s && <Line points={[s.x1, s.y1, s.x2, s.y2]} stroke={o.couleur} strokeWidth={o.epaisseur} lineCap="round" hitStrokeWidth={4} />}
      {[o.a, o.b].map((q, i) => (
        <Group key={i}>
          <Line points={[q.x - DEMI_CROIX, q.y - DEMI_CROIX, q.x + DEMI_CROIX, q.y + DEMI_CROIX]} stroke={o.couleur} strokeWidth={Math.max(0.35, o.epaisseur)} lineCap="round" />
          <Line points={[q.x - DEMI_CROIX, q.y + DEMI_CROIX, q.x + DEMI_CROIX, q.y - DEMI_CROIX]} stroke={o.couleur} strokeWidth={Math.max(0.35, o.epaisseur)} lineCap="round" />
        </Group>
      ))}
    </Group>
  );
}

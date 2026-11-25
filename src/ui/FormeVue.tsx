import { Group, Line, Rect } from 'react-konva';
import type Konva from 'konva';
import { cheminsLocaux } from '../model/formes';
import type { Forme } from '../model/types';

type Props = {
  o: Forme;
  draggable: boolean;
  /** false pour l'aperçu pendant le tracé : la forme ne capte aucun toucher. */
  listening?: boolean;
  onDragEnd?: (node: Konva.Node) => void;
  onTransformEnd?: (node: Konva.Node) => void;
};

/**
 * Une forme = un groupe (position, rotation, mise à l'échelle par les poignées) dont les enfants sont
 * dessinés dans le repère local. Le rectangle transparent donne au groupe sa boîte (poignées, saisie).
 */
export function FormeVue({ o, draggable, listening = true, onDragEnd, onTransformEnd }: Props) {
  return (
    <Group
      id={o.id}
      x={o.x}
      y={o.y}
      rotation={o.rotation}
      draggable={draggable}
      listening={listening}
      onDragEnd={e => onDragEnd?.(e.target)}
      onTransformEnd={e => onTransformEnd?.(e.target)}
    >
      <Rect width={o.largeur} height={o.hauteur} fill="rgba(0,0,0,0)" />
      {cheminsLocaux(o).map((c, i) => (
        <Line key={i} points={c.pts.flatMap(q => [q.x, q.y])} closed={c.ferme} stroke={o.couleur} strokeWidth={o.epaisseur}
          lineCap="round" lineJoin="round" listening={false} />
      ))}
    </Group>
  );
}

import { useEffect, useState } from 'react';
import { Group, Image as KImage, Line, Rect, Text } from 'react-konva';
import type Konva from 'konva';
import { couleurColonne, geometrieOperation, valeurCellule } from '../../maths/operation';
import { geometrieFraction } from '../../maths/fraction';
import { MARGE_MM, etiquettePoint, formatNombre, geometrieRepere, versMm } from '../../maths/repere';
import { ptVersMm } from '../../lib/units';
import type { Expression, Fraction, ObjetMaths, OperationPosee, Repere } from '../../model/types';

type Commun = { draggable: boolean; onDragEnd: (node: Konva.Node) => void };
const GRILLE = '#9cc2de';

function FormeOperation({ o, sansChiffres, ...g0 }: Commun & { o: OperationPosee; sansChiffres: boolean }) {
  const g = geometrieOperation(o);
  return (
    <Group x={o.x} y={o.y} draggable={g0.draggable} onDragEnd={e => g0.onDragEnd(e.target)}>
      <Rect width={g.largeur} height={g.hauteur} fill="rgba(0,0,0,0)" />
      {g.cellules.map(c => {
        const fond = c.zone === 'case' ? couleurColonne(o, c.index % o.colonnes) : null;
        const v = valeurCellule(o, c.zone, c.index);
        return (
          <Group key={`${c.zone}:${c.index}`}>
            <Rect x={c.x} y={c.y} width={c.l} height={c.h} fill={fond ?? undefined} stroke={GRILLE} strokeWidth={0.2}
              dash={c.zone === 'retenue' ? [1, 1] : undefined} />
            {!sansChiffres && v && (
              <Text x={c.x} y={c.y} width={c.l} height={c.h} text={v} align="center" verticalAlign="middle"
                fontFamily="Arial" fontSize={c.zone === 'retenue' ? 4 : 7} fill={o.couleur} />
            )}
          </Group>
        );
      })}
      {g.barres.map((b, i) => <Line key={i} points={[b.x1, b.y1, b.x2, b.y2]} stroke={o.couleur} strokeWidth={0.5} />)}
      {g.signe && (
        <Text x={g.signe.x - 5} y={g.signe.y - 5} width={10} height={10} text={o.operateur === '-' ? '−' : o.operateur}
          align="center" verticalAlign="middle" fontFamily="Arial" fontSize={7} fill={o.couleur} />
      )}
      {g.virgule && <Line points={[g.virgule.x, g.virgule.y1, g.virgule.x, g.virgule.y2]} stroke="#dc2626" strokeWidth={0.6} />}
    </Group>
  );
}

function FormeFraction({ o, ...g0 }: Commun & { o: Fraction }) {
  const g = geometrieFraction(o);
  const t = ptVersMm(o.taillePt);
  return (
    <Group x={o.x} y={o.y} draggable={g0.draggable} onDragEnd={e => g0.onDragEnd(e.target)}>
      <Rect width={g.largeur} height={g.hauteur} fill="rgba(0,0,0,0)" />
      <Text width={g.largeur} height={g.numerateur.h} text={o.numerateur} align="center" verticalAlign="middle" fontFamily="Arial" fontSize={t} fill={o.couleur} />
      <Line points={[0.5, g.barreY, g.largeur - 0.5, g.barreY]} stroke={o.couleur} strokeWidth={0.4} />
      <Text y={g.denominateur.y} width={g.largeur} height={g.denominateur.h} text={o.denominateur} align="center" verticalAlign="middle" fontFamily="Arial" fontSize={t} fill={o.couleur} />
    </Group>
  );
}

function FormeRepere({ o, ...g0 }: Commun & { o: Repere }) {
  const g = geometrieRepere(o);
  // Coordonnées relatives au groupe placé en (o.x, o.y).
  const rx = (x: number) => x - o.x;
  const ry = (y: number) => y - o.y;
  const gauche = MARGE_MM;
  const droite = g.largeur - MARGE_MM;
  const haut = MARGE_MM;
  const bas = g.hauteur - MARGE_MM;
  const ox = rx(g.origine.x);
  const oy = ry(g.origine.y);
  return (
    <Group x={o.x} y={o.y} draggable={g0.draggable} onDragEnd={e => g0.onDragEnd(e.target)}>
      <Rect width={g.largeur} height={g.hauteur} fill="rgba(0,0,0,0)" />
      {g.graduationsX.map(t => <Line key={`gx${t.valeur}`} points={[rx(t.position), haut, rx(t.position), bas]} stroke="#e5e7eb" strokeWidth={0.15} />)}
      {g.graduationsY.map(t => <Line key={`gy${t.valeur}`} points={[gauche, ry(t.position), droite, ry(t.position)]} stroke="#e5e7eb" strokeWidth={0.15} />)}
      <Line points={[gauche, oy, droite, oy]} stroke={o.couleur} strokeWidth={0.4} />
      <Line points={[ox, haut, ox, bas]} stroke={o.couleur} strokeWidth={0.4} />
      {g.graduationsX.filter(t => t.valeur !== 0).map(t => (
        <Text key={`lx${t.valeur}`} x={rx(t.position) - 4} y={oy + 1.2} width={8} text={formatNombre(t.valeur)} align="center" fontFamily="Arial" fontSize={2.8} fill={o.couleur} />
      ))}
      {g.graduationsY.filter(t => t.valeur !== 0).map(t => (
        <Text key={`ly${t.valeur}`} x={ox - 9} y={ry(t.position) - 1.4} width={7.5} text={formatNombre(t.valeur)} align="right" fontFamily="Arial" fontSize={2.8} fill={o.couleur} />
      ))}
      <Text x={ox - 4} y={oy + 1.2} width={3.5} text="0" align="right" fontFamily="Arial" fontSize={2.8} fill={o.couleur} />
      {o.points.map(pt => {
        const m = versMm(o, pt.x, pt.y);
        const x = rx(m.x);
        const y = ry(m.y);
        return (
          <Group key={pt.nom}>
            <Line points={[x - 1.2, y - 1.2, x + 1.2, y + 1.2]} stroke={o.couleur} strokeWidth={0.35} />
            <Line points={[x - 1.2, y + 1.2, x + 1.2, y - 1.2]} stroke={o.couleur} strokeWidth={0.35} />
            <Text x={x + 1.5} y={y - 4.5} text={etiquettePoint(pt)} fontFamily="Arial" fontSize={3.2} fill={o.couleur} />
          </Group>
        );
      })}
    </Group>
  );
}

function FormeExpression({ o, ...g0 }: Commun & { o: Expression }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    let vivant = true;
    if (!o.latex.trim()) { setImg(null); return; }
    import('../../maths/rasteriser').then(m => m.imageExpression(o)).then(i => vivant && setImg(i)).catch(() => vivant && setImg(null));
    return () => { vivant = false; };
  }, [o.latex, o.couleur, o.largeurMm, o.hauteurMm]);
  return (
    <Group x={o.x} y={o.y} draggable={g0.draggable} onDragEnd={e => g0.onDragEnd(e.target)}>
      <Rect width={Math.max(5, o.largeurMm)} height={Math.max(5, o.hauteurMm)} fill="rgba(0,0,0,0)" />
      {img ? (
        <KImage image={img} width={o.largeurMm} height={o.hauteurMm} />
      ) : (
        <Text text={o.latex} fontFamily="Arial" fontSize={ptVersMm(o.taillePt) * 0.8} fill={o.couleur} />
      )}
    </Group>
  );
}

type Props = Commun & { o: ObjetMaths; enEdition: boolean };

/** Objet en cours d'édition : la saisie HTML se superpose ; on ne garde que la grille (opération) ou le repère. */
export function FormeMaths({ o, enEdition, ...commun }: Props) {
  if (o.type === 'operation') return <FormeOperation o={o} sansChiffres={enEdition} {...commun} />;
  if (o.type === 'repere') return <FormeRepere o={o} {...commun} />;
  if (enEdition) return null;
  if (o.type === 'fraction') return <FormeFraction o={o} {...commun} />;
  return <FormeExpression o={o} {...commun} />;
}

import { Circle, Group, Line, Shape, Text } from 'react-konva';
import { COTE_EQUERRE_MM, DEFS, LARGEUR_REGLE_MM, LONGUEUR_REGLE_MM, type Instrument } from '../model/instruments';

const BLEU = '#1d4ed8';
const FOND = 'rgba(147, 197, 253, 0.38)';
const ENCRE = '#1e3a8a';

/** Rayon de la poignée de rotation (mm de page) : au moins ~22 px à l'écran, pour être attrapée du doigt. */
export const rayonPoignee = (pxMm: number) => Math.max(7, 22 / pxMm);

/** Graduations d'un bord : un trait par mm, plus long tous les 5 mm, le plus long (avec chiffre) tous les cm. */
function Graduations({ x0, y0, dx, dy, nx, ny, longueur, chiffres = true }: {
  x0: number; y0: number; dx: number; dy: number; nx: number; ny: number; longueur: number; chiffres?: boolean;
}) {
  const traits = Array.from({ length: Math.floor(longueur) + 1 }, (_, k) => k);
  return (
    <>
      <Shape listening={false} stroke={ENCRE} strokeWidth={0.14} sceneFunc={(ctx, shape) => {
        ctx.beginPath();
        for (const k of traits) {
          const t = k % 10 === 0 ? 6 : k % 5 === 0 ? 4 : 2.5;
          ctx.moveTo(x0 + dx * k, y0 + dy * k);
          ctx.lineTo(x0 + dx * k + nx * t, y0 + dy * k + ny * t);
        }
        ctx.fillStrokeShape(shape);
      }} />
      {chiffres && traits.filter(k => k % 10 === 0 && k > 0).map(k => (
        <Text key={k} listening={false} text={String(k / 10)} fontSize={3.6} fill={ENCRE}
          x={x0 + dx * k + nx * 7.5 - 2} y={y0 + dy * k + ny * 7.5 - 2} />
      ))}
    </>
  );
}

/** Règle ou équerre, à l'échelle réelle : 1 mm de graduation = 1 mm de page, quel que soit le zoom. */
export function InstrumentVue({ i, pxMm }: { i: Instrument; pxMm: number }) {
  const def = DEFS[i.id];
  const h = def.poignee;
  const r = rayonPoignee(pxMm);
  const coin = def.sommets[0];
  return (
    <Group x={i.x} y={i.y} rotation={i.angle}>
      <Line name="instrument-corps" points={def.sommets.flatMap(v => [v.x, v.y])} closed fill={FOND} stroke={BLEU} strokeWidth={0.5} hitStrokeWidth={0} />
      {i.id === 'regle' ? (
        <Graduations x0={-LONGUEUR_REGLE_MM / 2} y0={-LARGEUR_REGLE_MM / 2} dx={1} dy={0} nx={0} ny={1} longueur={LONGUEUR_REGLE_MM} />
      ) : (
        <>
          {/* Les deux côtés de l'angle droit sont gradués depuis le sommet de l'angle droit. */}
          <Graduations x0={coin.x} y0={coin.y} dx={1} dy={0} nx={0} ny={1} longueur={COTE_EQUERRE_MM - 12} />
          <Graduations x0={coin.x} y0={coin.y} dx={0} dy={1} nx={1} ny={0} longueur={COTE_EQUERRE_MM - 12} chiffres={false} />
          <Line listening={false} points={[coin.x + 12, coin.y + 22, coin.x + 22, coin.y + 22, coin.x + 22, coin.y + 12]} stroke={ENCRE} strokeWidth={0.2} />
        </>
      )}
      <Line listening={false} points={[0, 0, h.x, h.y]} stroke={BLEU} strokeWidth={0.3} dash={[1.5, 1.5]} />
      <Circle name="instrument-poignee" x={h.x} y={h.y} radius={r} fill="#ffffff" stroke={BLEU} strokeWidth={0.8} />
      <Text listening={false} text="↻" fontSize={r * 1.4} fill={BLEU} align="center" verticalAlign="middle"
        x={h.x - r} y={h.y - r} width={r * 2} height={r * 2} />
    </Group>
  );
}

import { Circle, Group, Line, Shape, Text } from 'react-konva';
import { COTE_EQUERRE_MM, DEFS, LARGEUR_REGLE_MM, LONGUEUR_REGLE_MM, RAYON_RAPPORTEUR_MM, crayonPage, longueurCm, type Instrument } from '../model/instruments';

const BLEU = '#1d4ed8';
const FOND = 'rgba(147, 197, 253, 0.38)';
const ENCRE = '#1e3a8a';

/** Rayon des poignées (mm de page) : au moins ~22 px à l'écran, pour être attrapées du doigt. */
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

/** Double graduation du rapporteur : un trait par degré ; chiffres tous les 10° dans les deux sens (0→180 et 180→0). */
function GraduationsRapporteur() {
  const R = RAYON_RAPPORTEUR_MM;
  const degres = Array.from({ length: 181 }, (_, k) => k);
  const pt = (deg: number, r: number) => ({ x: r * Math.cos((deg * Math.PI) / 180), y: -r * Math.sin((deg * Math.PI) / 180) });
  return (
    <>
      <Shape listening={false} stroke={ENCRE} strokeWidth={0.14} sceneFunc={(ctx, shape) => {
        ctx.beginPath();
        for (const d of degres) {
          const t = d % 10 === 0 ? 6 : d % 5 === 0 ? 4.5 : 3;
          const a = pt(d, R), b = pt(d, R - t);
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
        }
        // Base, et croix au centre : c'est là qu'on pose le sommet de l'angle à mesurer.
        ctx.moveTo(-R, 0); ctx.lineTo(R, 0);
        ctx.moveTo(-3, 0); ctx.lineTo(3, 0);
        ctx.moveTo(0, -3); ctx.lineTo(0, 3);
        ctx.fillStrokeShape(shape);
      }} />
      {degres.filter(d => d % 10 === 0).map(d => {
        const e = pt(d, R - 10), i = pt(d, R - 17);
        return (
          <Group key={d} listening={false}>
            <Text text={String(d)} fontSize={3.6} fill={ENCRE} x={e.x - 4} y={e.y - 2} width={8} align="center" />
            <Text text={String(180 - d)} fontSize={3} fill={BLEU} x={i.x - 4} y={i.y - 1.8} width={8} align="center" />
          </Group>
        );
      })}
    </>
  );
}

/** Règle, équerre, rapporteur : à l'échelle réelle (1 mm de graduation = 1 mm de page, quel que soit le zoom). Compas : pointe et mine. */
export function InstrumentVue({ i, pxMm }: { i: Instrument; pxMm: number }) {
  const r = rayonPoignee(pxMm);
  if (i.id === 'compas') return <CompasVue i={i} r={r} />;
  const def = DEFS[i.id];
  const h = def.poignee;
  const coin = def.sommets[0];
  return (
    <Group x={i.x} y={i.y} rotation={i.angle}>
      <Line name="instrument-corps" points={def.sommets.flatMap(v => [v.x, v.y])} closed fill={FOND} stroke={BLEU} strokeWidth={0.5} hitStrokeWidth={0} />
      {i.id === 'regle' && (
        <Graduations x0={-LONGUEUR_REGLE_MM / 2} y0={-LARGEUR_REGLE_MM / 2} dx={1} dy={0} nx={0} ny={1} longueur={LONGUEUR_REGLE_MM} />
      )}
      {i.id === 'equerre' && (
        <>
          {/* Les deux côtés de l'angle droit sont gradués depuis le sommet de l'angle droit. */}
          <Graduations x0={coin.x} y0={coin.y} dx={1} dy={0} nx={0} ny={1} longueur={COTE_EQUERRE_MM - 12} />
          <Graduations x0={coin.x} y0={coin.y} dx={0} dy={1} nx={1} ny={0} longueur={COTE_EQUERRE_MM - 12} chiffres={false} />
          <Line listening={false} points={[coin.x + 12, coin.y + 22, coin.x + 22, coin.y + 22, coin.x + 22, coin.y + 12]} stroke={ENCRE} strokeWidth={0.2} />
        </>
      )}
      {i.id === 'rapporteur' && <GraduationsRapporteur />}
      <Line listening={false} points={[0, 0, h.x, h.y]} stroke={BLEU} strokeWidth={0.3} dash={[1.5, 1.5]} />
      <Circle name="instrument-poignee" x={h.x} y={h.y} radius={r} fill="#ffffff" stroke={BLEU} strokeWidth={0.8} />
      <Text listening={false} text="↻" fontSize={r * 1.4} fill={BLEU} align="center" verticalAlign="middle"
        x={h.x - r} y={h.y - r} width={r * 2} height={r * 2} />
    </Group>
  );
}

/**
 * Compas : la pointe (croix) déplace le compas ; la mine (rond plein) se glisse autour de la pointe et trace un arc.
 * L'écartement se règle avec les boutons de la fenêtre d'options (Editeur) : on voit sa valeur ici.
 */
function CompasVue({ i, r }: { i: Instrument; r: number }) {
  const rayon = i.rayon ?? 40;
  const mine = crayonPage(i);
  return (
    <Group>
      <Circle listening={false} x={i.x} y={i.y} radius={rayon} stroke={BLEU} strokeWidth={0.25} dash={[2, 2]} opacity={0.6} />
      <Line listening={false} points={[i.x, i.y, mine.x, mine.y]} stroke={BLEU} strokeWidth={0.6} />
      <Text listening={false} text={longueurCm(rayon)} fontSize={4.5} fontStyle="bold" fill={ENCRE}
        x={(i.x + mine.x) / 2 - 8} y={(i.y + mine.y) / 2 - 8 - r * 0.6} />
      <Circle name="instrument-corps" x={i.x} y={i.y} radius={r} fill="#ffffff" stroke={BLEU} strokeWidth={0.8} />
      <Line listening={false} points={[i.x - r * 0.6, i.y, i.x + r * 0.6, i.y]} stroke={BLEU} strokeWidth={0.5} />
      <Line listening={false} points={[i.x, i.y - r * 0.6, i.x, i.y + r * 0.6]} stroke={BLEU} strokeWidth={0.5} />
      <Circle name="instrument-crayon" x={mine.x} y={mine.y} radius={r} fill={BLEU} stroke="#ffffff" strokeWidth={0.8} />
      <Circle listening={false} x={mine.x} y={mine.y} radius={r * 0.25} fill="#ffffff" />
    </Group>
  );
}

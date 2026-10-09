import type { Expression } from '../model/types';
import { latexVersSvg } from './expression';

const PX_PAR_MM_EXPORT = 12; // ≈ 300 dpi

function svgDimensionne(svg: string, l: number, h: number): string {
  // Les premiers width/height du texte sont ceux de la balise <svg> racine.
  return svg.replace(/width="[^"]*"/, `width="${l}"`).replace(/height="[^"]*"/, `height="${h}"`);
}

async function chargerImage(svg: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await img.decode();
  return img;
}

const cache = new Map<string, Promise<HTMLImageElement>>();

/** Image affichée à l'écran (Konva), mise en cache par contenu et couleur. */
export function imageExpression(o: Expression): Promise<HTMLImageElement> {
  const k = `${o.couleur}|${o.latex}`;
  let p = cache.get(k);
  if (!p) {
    p = latexVersSvg(o.latex, o.couleur).then(r => chargerImage(svgDimensionne(r.svg, Math.max(1, o.largeurMm * 8), Math.max(1, o.hauteurMm * 8))));
    cache.set(k, p);
    p.catch(() => cache.delete(k));
  }
  return p;
}

/** PNG ~300 dpi pour l'export PDF. */
export async function rasteriserExpression(o: Expression): Promise<Uint8Array> {
  const r = await latexVersSvg(o.latex, o.couleur);
  const l = Math.max(1, Math.round(o.largeurMm * PX_PAR_MM_EXPORT));
  const h = Math.max(1, Math.round(o.hauteurMm * PX_PAR_MM_EXPORT));
  const img = await chargerImage(svgDimensionne(r.svg, l, h));
  const c = document.createElement('canvas');
  c.width = l;
  c.height = h;
  c.getContext('2d')!.drawImage(img, 0, 0, l, h);
  const blob = await new Promise<Blob>((ok, ko) => c.toBlob(b => (b ? ok(b) : ko(new Error('PNG impossible'))), 'image/png'));
  return new Uint8Array(await blob.arrayBuffer());
}

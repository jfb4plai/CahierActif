import { mathjax } from '@mathjax/src/js/mathjax.js';
import { TeX } from '@mathjax/src/js/input/tex.js';
import { SVG } from '@mathjax/src/js/output/svg.js';
import { liteAdaptor } from '@mathjax/src/js/adaptors/liteAdaptor.js';
import { RegisterHTMLHandler } from '@mathjax/src/js/handlers/html.js';
import '@mathjax/src/js/input/tex/base/BaseConfiguration.js';
import '@mathjax/src/js/input/tex/ams/AmsConfiguration.js';
import { ptVersMm } from '../lib/units';

export type RenduExpression = { svg: string; largeurEm: number; hauteurEm: number; erreur: boolean };

// Initialisation paresseuse : ce module n'est importé qu'à la demande (outil Expression, export).
let moteur: { adaptor: ReturnType<typeof liteAdaptor>; doc: ReturnType<typeof mathjax.document> } | null = null;

function initialiser() {
  if (!moteur) {
    const adaptor = liteAdaptor();
    RegisterHTMLHandler(adaptor);
    const doc = mathjax.document('', {
      InputJax: new TeX({ packages: ['base', 'ams'] }),
      OutputJax: new SVG({ fontCache: 'none', linebreaks: { inline: false } }), // chemins autonomes : le SVG se suffit à lui-même (image, export)
    });
    moteur = { adaptor, doc };
  }
  return moteur;
}

export async function latexVersSvg(latex: string, couleur: string): Promise<RenduExpression> {
  if (!latex.trim()) return { svg: '', largeurEm: 0, hauteurEm: 0, erreur: false };
  const { adaptor, doc } = initialiser();
  const noeud = await doc.convertPromise(latex, { display: false });
  const brut = adaptor.innerHTML(noeud);
  const vb = /viewBox="([^"]+)"/.exec(brut)?.[1].split(' ').map(Number) ?? [0, 0, 1000, 1000];
  return {
    svg: brut.replace(/currentColor/g, couleur),
    largeurEm: vb[2] / 1000, // MathJax : 1 em = 1000 unités de viewBox
    hauteurEm: vb[3] / 1000,
    erreur: /data-mjx-error/.test(brut),
  };
}

export function dimensionsMm(r: RenduExpression, taillePt: number): { largeurMm: number; hauteurMm: number } {
  const em = ptVersMm(taillePt);
  return { largeurMm: r.largeurEm * em, hauteurMm: r.hauteurEm * em };
}

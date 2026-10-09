import { MathfieldElement } from 'mathlive';

// Polices servies par l'app (scripts/copier-mathlive.mjs), pas de sons, virgule décimale belge.
MathfieldElement.fontsDirectory = '/mathlive/fonts';
MathfieldElement.soundsDirectory = null;
MathfieldElement.decimalSeparator = ',';

/** Clavier réduit : ce qu'un élève du secondaire utilise le plus souvent. */
export const CLAVIER_SIMPLE = {
  label: 'Simple',
  rows: [
    ['7', '8', '9', '+', '-', '\\times', '\\div', '(', ')'],
    ['4', '5', '6', '=', '<', '>', '\\le', '\\ge', '\\neq'],
    ['1', '2', '3', ',', 'x', 'y', '\\pi', '\\frac{#@}{#?}', '#@^{#?}'],
    ['0', '\\sqrt{#0}', '[left]', '[right]', '[backspace]'],
  ],
};

export function choisirClavier(complet: boolean) {
  window.mathVirtualKeyboard.layouts = complet ? ['numeric', 'symbols', 'alphabetic', 'greek'] : [CLAVIER_SIMPLE];
}

export function creerChampMaths(latex: string): MathfieldElement {
  choisirClavier(false);
  const mf = new MathfieldElement();
  mf.value = latex;
  mf.mathVirtualKeyboardPolicy = 'manual';
  mf.smartFence = true;
  return mf;
}

export function afficherClavier(visible: boolean) {
  if (visible) window.mathVirtualKeyboard.show();
  else window.mathVirtualKeyboard.hide();
}

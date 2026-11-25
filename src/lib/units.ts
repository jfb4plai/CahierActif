// Toutes les positions du modèle sont en millimètres de page.
export const MM_PAR_PT = 25.4 / 72;
const PX_PAR_MM_ZOOM1 = 96 / 25.4;

export function pxParMm(zoom: number): number {
  return zoom * PX_PAR_MM_ZOOM1;
}

export function ptVersMm(pt: number): number {
  return pt * MM_PAR_PT;
}

export function mmVersPt(mm: number): number {
  return mm / MM_PAR_PT;
}

// iOS Safari refuse (ou vide) un canvas au-delà d'environ 16,7 Mpx.
export const PIXELS_CANVAS_MAX = 16_000_000;

/** Ratio de pixels effectif : celui de l'écran, réduit si le canvas dépasserait PIXELS_CANVAS_MAX. */
export function ratioPixelsMax(wCss: number, hCss: number, dpr: number): number {
  const surface = wCss * hCss;
  if (surface <= 0) return dpr;
  return Math.min(dpr, Math.sqrt(PIXELS_CANVAS_MAX / surface));
}

/** Zoom (≤ 1, par pas de 5 %, ≥ 0,5) pour que la page tienne dans `largeurDispoPx` sans défilement horizontal. */
export function zoomAjuste(largeurDispoPx: number, largeurPageMm: number): number {
  const brut = largeurDispoPx / (largeurPageMm * PX_PAR_MM_ZOOM1);
  return Math.max(0.5, Math.min(1, Math.floor(brut * 20) / 20));
}

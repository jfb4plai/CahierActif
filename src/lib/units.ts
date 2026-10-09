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

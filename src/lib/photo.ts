import type { ImageSource, TaillePage } from '../model/types';

export const PHOTO_COTE_MAX_PX = 2200; // au-delà : réduite (mémoire des tablettes, poids du PDF exporté)
export const PHOTO_QUALITE_JPEG = 0.85;
export const PHOTOS_MAX_PAR_IMPORT = 20;
export const PAGE_COTE_LONG_MM = 297; // le grand côté de la page fait la longueur d'un A4

export class PhotoIllisibleError extends Error {}

/** Dimensions (px) ramenées à `max` sur le grand côté, proportions gardées ; jamais agrandies. */
export function dimensionsReduites(largeur: number, hauteur: number, max = PHOTO_COTE_MAX_PX): { largeur: number; hauteur: number } {
  const grand = Math.max(largeur, hauteur);
  if (grand <= max) return { largeur, hauteur };
  const k = max / grand;
  return { largeur: Math.max(1, Math.round(largeur * k)), hauteur: Math.max(1, Math.round(hauteur * k)) };
}

/** Page à la forme de la photo : portrait ou paysage, grand côté = 297 mm. */
export function taillePageDepuisImage(largeurPx: number, hauteurPx: number): TaillePage {
  if (largeurPx <= 0 || hauteurPx <= 0) return { largeurMm: 210, hauteurMm: PAGE_COTE_LONG_MM };
  const k = PAGE_COTE_LONG_MM / Math.max(largeurPx, hauteurPx);
  return { largeurMm: +(largeurPx * k).toFixed(2), hauteurMm: +(hauteurPx * k).toFixed(2) };
}

/**
 * Lit une photo (JPEG, PNG, et ce que le navigateur sait décoder), applique son orientation, la réduit
 * et la réenregistre en JPEG sur fond blanc. Navigateur seulement.
 */
export async function preparerPhoto(f: File): Promise<{ image: ImageSource; taille: TaillePage }> {
  const message = `« ${f.name} » ne peut pas être lue. Choisir une photo JPEG ou PNG.`;
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(f, { imageOrientation: 'from-image' });
  } catch {
    throw new PhotoIllisibleError(message);
  }
  try {
    const { largeur, hauteur } = dimensionsReduites(bmp.width, bmp.height);
    const c = document.createElement('canvas');
    c.width = largeur;
    c.height = hauteur;
    const ctx = c.getContext('2d');
    if (!ctx) throw new PhotoIllisibleError(message);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, largeur, hauteur);
    ctx.drawImage(bmp, 0, 0, largeur, hauteur);
    const blob = await new Promise<Blob | null>(res => c.toBlob(res, 'image/jpeg', PHOTO_QUALITE_JPEG));
    if (!blob) throw new PhotoIllisibleError(message);
    return { image: { mime: 'image/jpeg', data: await blob.arrayBuffer() }, taille: taillePageDepuisImage(largeur, hauteur) };
  } finally {
    bmp.close();
  }
}

/** Prépare plusieurs photos dans l'ordre reçu. Échoue sur la première illisible (message nommant le fichier). */
export async function preparerPhotos(fichiers: File[]): Promise<{ images: ImageSource[]; tailles: TaillePage[] }> {
  if (fichiers.length > PHOTOS_MAX_PAR_IMPORT) {
    throw new PhotoIllisibleError(`Trop de photos d’un coup : ${PHOTOS_MAX_PAR_IMPORT} au maximum.`);
  }
  const images: ImageSource[] = [];
  const tailles: TaillePage[] = [];
  for (const f of fichiers) {
    const p = await preparerPhoto(f);
    images.push(p.image);
    tailles.push(p.taille);
  }
  return { images, tailles };
}

import type { ImageSource, TaillePage } from '../model/types';

export type PhotoPrete = { image: ImageSource; taille: TaillePage };

/** Résultat d'une photo de la file : la photo redressée si l'élève a appliqué, sinon la photo d'origine. */
export function choisirResultat(origine: PhotoPrete, redressee: PhotoPrete | null): PhotoPrete {
  return redressee ?? origine;
}

export function titreFile(rang: number, total: number): string {
  return total > 1 ? `Photo ${rang + 1} sur ${total}` : 'Photo à recadrer';
}

export function libelleDetection(detecte: boolean): string {
  return detecte
    ? 'Feuille détectée : vérifier les coins, puis appliquer.'
    : 'Feuille non détectée : placer les 4 coins sur la feuille.';
}

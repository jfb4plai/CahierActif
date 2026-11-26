export const TITRE_MAX = 60;

/** Titre proposé à la création : « Page vierge, 26/11 à 07:46 ». Deux documents créés au même moment du jour se distinguent par la date. */
export function titreParDefaut(base: string, date: Date = new Date()): string {
  const deux = (n: number) => String(n).padStart(2, '0');
  return `${base}, ${deux(date.getDate())}/${deux(date.getMonth() + 1)} à ${deux(date.getHours())}:${deux(date.getMinutes())}`;
}

/** Titre nettoyé, ou le message à montrer à l'élève. */
export function verifierTitre(brut: string): { titre: string } | { erreur: string } {
  const titre = brut.replace(/\s+/g, ' ').trim();
  if (!titre) return { erreur: 'Écrire un nom pour le document.' };
  if (titre.length > TITRE_MAX) return { erreur: `Nom trop long : ${TITRE_MAX} lettres au maximum.` };
  return { titre };
}

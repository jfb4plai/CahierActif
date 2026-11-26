/**
 * Mode verrouillé : un code d'adulte à 4 chiffres protège les réglages et la suppression des documents.
 * Limite à connaître : tout reste dans le navigateur de l'appareil. Le code évite qu'un élève change un réglage ou supprime un
 * travail par erreur ou par jeu ; il ne protège pas contre une personne qui efface les données du site.
 */
export type Verrou = { sel: string; empreinte: string };

const CLE = 'cahieractif.verrou';

export const codeValide = (code: string): boolean => /^\d{4}$/.test(code);

async function sha256(texte: string): Promise<string> {
  const octets = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texte));
  return Array.from(new Uint8Array(octets), b => b.toString(16).padStart(2, '0')).join('');
}

/** Crée l'empreinte d'un code : on ne garde jamais le code lui-même. */
export async function creerVerrou(code: string): Promise<Verrou> {
  if (!codeValide(code)) throw new Error('Le code doit avoir 4 chiffres.');
  const sel = Array.from(crypto.getRandomValues(new Uint8Array(8)), b => b.toString(16).padStart(2, '0')).join('');
  return { sel, empreinte: await sha256(sel + code) };
}

export async function verifierCode(code: string, verrou: Verrou): Promise<boolean> {
  return codeValide(code) && (await sha256(verrou.sel + code)) === verrou.empreinte;
}

export function lireVerrou(s: Pick<Storage, 'getItem'> | null = stockage()): Verrou | null {
  try {
    const v = JSON.parse(s?.getItem(CLE) ?? 'null');
    return typeof v?.sel === 'string' && typeof v?.empreinte === 'string' ? { sel: v.sel, empreinte: v.empreinte } : null;
  } catch {
    return null;
  }
}

export function ecrireVerrou(v: Verrou | null, s: Pick<Storage, 'setItem' | 'removeItem'> | null = stockage()): void {
  try {
    if (v) s?.setItem(CLE, JSON.stringify(v));
    else s?.removeItem(CLE);
  } catch {
    // stockage bloqué : le verrou vaut pour la session seulement
  }
}

function stockage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';

const DELAI_OUVERTURE_MS = 200;
const DELAI_FERMETURE_MS = 350;

/**
 * Aperçu au survol, pour la souris seulement : ni le doigt ni le stylet ne le déclenchent
 * (un stylet qui passe près du bord en écrivant ne doit rien ouvrir). Ouverture avec un court délai,
 * fermeture retardée pour laisser le temps d'atteindre le volet.
 */
export function usePeek() {
  const [peek, setPeek] = useState(false);
  const minuterie = useRef<number>();

  const planifier = useCallback((ouvert: boolean, delai: number) => {
    window.clearTimeout(minuterie.current);
    minuterie.current = window.setTimeout(() => setPeek(ouvert), delai);
  }, []);
  useEffect(() => () => window.clearTimeout(minuterie.current), []);

  const fermer = useCallback(() => {
    window.clearTimeout(minuterie.current);
    setPeek(false);
  }, []);

  const liens = {
    onPointerEnter: (e: PointerEvent) => { if (e.pointerType === 'mouse') planifier(true, DELAI_OUVERTURE_MS); },
    onPointerLeave: (e: PointerEvent) => { if (e.pointerType === 'mouse') planifier(false, DELAI_FERMETURE_MS); },
  };

  return { peek, fermer, liens };
}

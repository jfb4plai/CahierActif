import { useEffect, useRef, useState } from 'react';
import { HAUTEUR_LIGNE_CACHE_MM, borneY, hauteurFenetre } from '../model/cacheligne';

type Props = {
  pxMm: number;
  y: number; // haut de la fenêtre, mm de page
  lignes: number;
  hauteurPageMm: number;
  onFin: (y: number) => void;
};

const VOILE = 'rgba(31, 41, 55, 0.94)';
const LISERE = '#1d4ed8';

/**
 * Cache-ligne : deux bandes sombres, au-dessus et au-dessous d'une fenêtre de 1 à 3 lignes. Glisser une bande déplace la fenêtre
 * (de haut en bas seulement) ; les flèches du clavier la déplacent d'une ligne. Dans la fenêtre, la page reste utilisable.
 */
export function CacheLigneVue({ pxMm, y, lignes, hauteurPageMm, onFin }: Props) {
  const [pos, setPos] = useState(y);
  const posRef = useRef(pos);
  posRef.current = pos;
  const prise = useRef<{ id: number; clientY: number; y: number } | null>(null);
  useEffect(() => setPos(borneY(y, lignes, hauteurPageMm)), [y, lignes, hauteurPageMm]);

  const hFen = hauteurFenetre(lignes);
  const bande = (haut: boolean) => ({
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
      if (prise.current) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      prise.current = { id: e.pointerId, clientY: e.clientY, y: posRef.current };
    },
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
      const p = prise.current;
      if (!p || e.pointerId !== p.id) return;
      setPos(borneY(p.y + (e.clientY - p.clientY) / pxMm, lignes, hauteurPageMm));
    },
    onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => {
      const p = prise.current;
      if (!p || e.pointerId !== p.id) return;
      prise.current = null;
      onFin(posRef.current);
    },
    onPointerCancel: () => { prise.current = null; onFin(posRef.current); },
    onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      const suivant = borneY(posRef.current + (e.key === 'ArrowDown' ? 1 : -1) * HAUTEUR_LIGNE_CACHE_MM, lignes, hauteurPageMm);
      setPos(suivant);
      onFin(suivant);
    },
    tabIndex: 0,
    role: 'group' as const,
    'aria-label': haut ? 'Cache-ligne, partie haute. Flèches haut et bas pour déplacer la fenêtre.' : 'Cache-ligne, partie basse. Flèches haut et bas pour déplacer la fenêtre.',
  });

  const commun = { position: 'absolute' as const, left: 0, right: 0, background: VOILE, touchAction: 'none' as const, cursor: 'grab', zIndex: 20 };
  return (
    <>
      <div data-cache-ligne {...bande(true)} style={{ ...commun, top: 0, height: pos * pxMm, borderBottom: `3px solid ${LISERE}` }} />
      <div data-cache-ligne {...bande(false)} style={{ ...commun, top: (pos + hFen) * pxMm, bottom: 0, borderTop: `3px solid ${LISERE}` }} />
    </>
  );
}

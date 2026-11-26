import { useEffect, useRef, useState, type RefObject } from 'react';
import { DIAMETRE_LOUPE_PX, destination } from '../model/loupe';

type Props = {
  /** Élément de la page : on recopie ses canvas et ses images (PDF, fond, annotations, instruments, photo). */
  racine: RefObject<HTMLElement>;
  pxMm: number;
  x: number;
  y: number;
  facteur: number;
  onFin: (centre: { x: number; y: number }) => void;
};

/**
 * Loupe : cercle posé sur la page, qui montre en direct ce qu'il recouvre en plus grand (copie des canvas déjà dessinés).
 * Elle se déplace en glissant (doigt, stylet ou souris). Ce qu'elle recouvre ne se touche pas : on la déplace d'abord.
 */
export function LoupeVue({ racine, pxMm, x, y, facteur, onFin }: Props) {
  const D = DIAMETRE_LOUPE_PX;
  const canvas = useRef<HTMLCanvasElement>(null);
  const [centre, setCentre] = useState({ x, y }); // mm de page
  const centreRef = useRef(centre);
  centreRef.current = centre;
  const prise = useRef<{ id: number; clientX: number; clientY: number; x: number; y: number } | null>(null);
  useEffect(() => setCentre({ x, y }), [x, y]);

  useEffect(() => {
    const dpr = window.devicePixelRatio || 1;
    let image = 0;
    const dessiner = () => {
      const c = canvas.current, page = racine.current;
      if (c && page) {
        if (c.width !== Math.round(D * dpr)) { c.width = Math.round(D * dpr); c.height = Math.round(D * dpr); }
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, D, D);
          const rp = page.getBoundingClientRect();
          const cx = centreRef.current.x * pxMm, cy = centreRef.current.y * pxMm;
          for (const el of page.querySelectorAll<HTMLCanvasElement | HTMLImageElement>('canvas, img')) {
            if (el.closest('[data-loupe]')) continue;
            if (el instanceof HTMLImageElement && !el.complete) continue;
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) continue;
            const d = destination(r.left - rp.left, r.top - rp.top, r.width, r.height, cx, cy, D, facteur);
            try { ctx.drawImage(el, d.x, d.y, d.l, d.h); } catch { /* canvas indisponible : on saute cette image */ }
          }
          // Petite croix au centre : le point que la loupe regarde.
          ctx.strokeStyle = 'rgba(29, 78, 216, 0.55)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(D / 2 - 8, D / 2); ctx.lineTo(D / 2 + 8, D / 2);
          ctx.moveTo(D / 2, D / 2 - 8); ctx.lineTo(D / 2, D / 2 + 8);
          ctx.stroke();
        }
      }
      image = requestAnimationFrame(dessiner);
    };
    image = requestAnimationFrame(dessiner);
    return () => cancelAnimationFrame(image);
  }, [racine, pxMm, facteur, D]);

  return (
    <div
      data-loupe
      role="img"
      aria-label={`Loupe ×${facteur}. Glisser pour la déplacer.`}
      className="absolute select-none overflow-hidden rounded-full bg-white"
      style={{
        left: centre.x * pxMm - D / 2, top: centre.y * pxMm - D / 2, width: D, height: D,
        border: '4px solid #1d4ed8', boxShadow: '0 6px 20px rgba(0,0,0,0.35)', touchAction: 'none', cursor: 'grab', zIndex: 30,
      }}
      onPointerDown={e => {
        if (prise.current) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        prise.current = { id: e.pointerId, clientX: e.clientX, clientY: e.clientY, x: centre.x, y: centre.y };
      }}
      onPointerMove={e => {
        const p = prise.current;
        if (!p || e.pointerId !== p.id) return;
        setCentre({ x: p.x + (e.clientX - p.clientX) / pxMm, y: p.y + (e.clientY - p.clientY) / pxMm });
      }}
      onPointerUp={e => {
        const p = prise.current;
        if (!p || e.pointerId !== p.id) return;
        prise.current = null;
        onFin(centreRef.current);
      }}
      onPointerCancel={() => { prise.current = null; onFin(centreRef.current); }}
    >
      <canvas ref={canvas} style={{ width: D, height: D, display: 'block', pointerEvents: 'none' }} />
      <span aria-hidden className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-[#1d4ed8] px-2 text-sm font-bold text-white">×{facteur}</span>
    </div>
  );
}

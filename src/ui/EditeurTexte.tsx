import { useEffect, useRef, useState } from 'react';
import { ptVersMm } from '../lib/units';
import type { Texte } from '../model/types';

type Props = { texte: Texte; pxMm: number; onFin: (valeur: string) => void };

/** Zone de saisie HTML posée exactement sur la zone de texte Konva. */
export function EditeurTexte({ texte, pxMm, onFin }: Props) {
  const [valeur, setValeur] = useState(texte.texte);
  const ref = useRef<HTMLTextAreaElement>(null);
  // Focus différé : le mousedown qui a ouvert la zone redonnerait sinon le focus au body (blur → fermeture).
  useEffect(() => {
    const t = setTimeout(() => ref.current?.focus(), 0);
    return () => clearTimeout(t);
  }, []);
  const taillePx = ptVersMm(texte.taillePt) * pxMm;

  return (
    <textarea
      ref={ref}
      value={valeur}
      aria-label="Zone de texte"
      onChange={e => setValeur(e.target.value)}
      onBlur={() => onFin(valeur)}
      onKeyDown={e => { if (e.key === 'Escape') ref.current?.blur(); }}
      rows={Math.max(1, valeur.split('\n').length)}
      style={{
        position: 'absolute',
        left: texte.x * pxMm,
        top: texte.y * pxMm,
        width: texte.largeur * pxMm,
        fontFamily: 'Arial, sans-serif',
        fontSize: taillePx,
        lineHeight: 1.5,
        color: texte.couleur,
        background: 'rgba(255,255,255,0.9)',
        border: '2px solid #0f6e56',
        padding: 0,
        resize: 'none',
        overflow: 'hidden',
        zIndex: 10,
      }}
    />
  );
}

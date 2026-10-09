import { useEffect, useRef, useState } from 'react';
import { ptVersMm } from '../lib/units';
import type { Texte } from '../model/types';

type Props = { texte: Texte; pxMm: number; onChange: (valeur: string) => void; onFin: (valeur: string) => void };

/** Zone de saisie HTML posée exactement sur la zone de texte Konva. */
export function EditeurTexte({ texte, pxMm, onChange, onFin }: Props) {
  const [valeur, setValeur] = useState(texte.texte);
  const ref = useRef<HTMLTextAreaElement>(null);
  const valeurRef = useRef(valeur);
  const onFinRef = useRef(onFin);
  onFinRef.current = onFin;
  const monte = useRef(false);
  useEffect(() => {
    monte.current = true;
    // Focus différé : le mousedown qui a ouvert la zone redonnerait sinon le focus au body (blur → fermeture).
    const t = setTimeout(() => ref.current?.focus(), 0);
    return () => {
      clearTimeout(t);
      monte.current = false;
      // iOS ne déclenche pas toujours blur : on valide au démontage. Différé pour ignorer le démontage simulé de StrictMode.
      queueMicrotask(() => { if (!monte.current) onFinRef.current(valeurRef.current); });
    };
  }, []);
  const taillePx = ptVersMm(texte.taillePt) * pxMm;

  return (
    <textarea
      ref={ref}
      value={valeur}
      aria-label="Zone de texte"
      onChange={e => {
        valeurRef.current = e.target.value;
        setValeur(e.target.value);
        onChange(e.target.value);
      }}
      onBlur={() => onFin(valeurRef.current)}
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

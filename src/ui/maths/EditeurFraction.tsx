import { useEffect, useRef } from 'react';
import { geometrieFraction } from '../../maths/fraction';
import { ptVersMm } from '../../lib/units';
import type { Fraction } from '../../model/types';

type Props = { o: Fraction; pxMm: number; onChange: (o: Fraction) => void; onFin: (o: Fraction) => void };

export function EditeurFraction({ o, pxMm, onChange, onFin }: Props) {
  const g = geometrieFraction(o);
  const num = useRef<HTMLInputElement>(null);
  const courant = useRef(o);
  courant.current = o;
  useEffect(() => {
    const t = setTimeout(() => num.current?.focus(), 0);
    return () => clearTimeout(t);
  }, []);
  const taille = ptVersMm(o.taillePt) * pxMm;
  const style = (y: number): React.CSSProperties => ({
    position: 'absolute', left: 0, top: y * pxMm, width: Math.max(g.largeur, 12) * pxMm, height: g.numerateur.h * pxMm,
    textAlign: 'center', fontFamily: 'Arial, sans-serif', fontSize: taille, color: o.couleur,
    background: 'transparent', border: 'none', outline: '1px dashed #0f6e56', padding: 0,
  });
  const touches = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); onFin(courant.current); }
  };
  return (
    <div style={{ position: 'absolute', left: o.x * pxMm, top: o.y * pxMm, zIndex: 10 }}>
      <input ref={num} aria-label="Numérateur" value={o.numerateur} maxLength={8} style={style(0)} onKeyDown={touches}
        onChange={e => onChange({ ...courant.current, numerateur: e.target.value })} />
      <div aria-hidden style={{ position: 'absolute', left: 0, top: g.barreY * pxMm, width: Math.max(g.largeur, 12) * pxMm, borderTop: `2px solid ${o.couleur}` }} />
      <input aria-label="Dénominateur" value={o.denominateur} maxLength={8} style={style(g.denominateur.y)} onKeyDown={touches}
        onChange={e => onChange({ ...courant.current, denominateur: e.target.value })} />
    </div>
  );
}

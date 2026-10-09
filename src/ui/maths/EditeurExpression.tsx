import { useEffect, useRef, useState } from 'react';
import { ptVersMm } from '../../lib/units';
import type { Expression } from '../../model/types';

type Props = { o: Expression; pxMm: number; onChange: (o: Expression) => void; onFin: (o: Expression) => void };

export function EditeurExpression({ o, pxMm, onChange, onFin }: Props) {
  const hote = useRef<HTMLDivElement>(null);
  const courant = useRef(o);
  const rappel = useRef(onChange);
  rappel.current = onChange;
  const [complet, setComplet] = useState(false);
  const [pret, setPret] = useState(false);

  useEffect(() => {
    let vivant = true;
    let champ: HTMLElement | null = null;
    let tour = 0;
    (async () => {
      const ml = await import('../../maths/mathlive');
      const { latexVersSvg, dimensionsMm } = await import('../../maths/expression');
      if (!vivant || !hote.current) return;
      const mf = ml.creerChampMaths(courant.current.latex);
      champ = mf;
      mf.addEventListener('input', async () => {
        const n = ++tour; // ignore les rendus arrivés dans le désordre
        const latex = mf.value;
        const r = await latexVersSvg(latex, courant.current.couleur);
        if (n !== tour) return;
        courant.current = { ...courant.current, latex, ...dimensionsMm(r, courant.current.taillePt) };
        rappel.current(courant.current);
      });
      hote.current.appendChild(mf);
      setPret(true);
      setTimeout(() => { mf.focus(); ml.afficherClavier(true); }, 0);
    })();
    return () => {
      vivant = false;
      void import('../../maths/mathlive').then(ml => ml.afficherClavier(false));
      champ?.remove();
    };
  }, []);

  const basculer = async () => {
    const ml = await import('../../maths/mathlive');
    ml.choisirClavier(!complet);
    setComplet(!complet);
  };

  return (
    <div style={{ position: 'absolute', left: o.x * pxMm, top: o.y * pxMm, zIndex: 10, minWidth: 60 * pxMm }}>
      <div ref={hote} style={{ fontSize: ptVersMm(o.taillePt) * pxMm, color: o.couleur, outline: '1px dashed #0f6e56', background: 'rgba(255,255,255,0.85)' }}>
        {!pret && <span className="text-[var(--text2)]">Chargement du clavier mathématique…</span>}
      </div>
      <div className="mt-1 flex gap-2">
        <button type="button" className="plai-btn min-h-[44px]" onMouseDown={e => e.preventDefault()} onClick={basculer}>
          {complet ? 'Clavier simple' : 'Clavier complet'}
        </button>
        <button type="button" className="plai-btn min-h-[44px]" onMouseDown={e => e.preventDefault()} onClick={() => onFin(courant.current)}>Terminé</button>
      </div>
    </div>
  );
}

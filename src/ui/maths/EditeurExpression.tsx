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

  // Dernier calcul de dimensions en cours : « Terminé » l'attend pour valider la taille réelle.
  const rendu = useRef<Promise<void>>(Promise.resolve());
  const vivantRef = useRef(true);

  useEffect(() => {
    let vivant = true;
    vivantRef.current = true;
    let champ: HTMLElement | null = null;
    let tour = 0;
    (async () => {
      const ml = await import('../../maths/mathlive');
      const { latexVersSvg, dimensionsMm } = await import('../../maths/expression');
      if (!vivant || !hote.current) return;
      // Dimensions recalculées depuis le rendu MathJax : toucher, gomme et export utilisent la taille réelle.
      const mesurer = (latex: string) => {
        const n = ++tour; // ignore les rendus arrivés dans le désordre
        rendu.current = latexVersSvg(latex, courant.current.couleur).then(
          r => {
            if (!vivant || n !== tour) return;
            const d = dimensionsMm(r, courant.current.taillePt);
            if (d.largeurMm === courant.current.largeurMm && d.hauteurMm === courant.current.hauteurMm) return;
            courant.current = { ...courant.current, ...d };
            rappel.current(courant.current);
          },
          () => {}, // rendu impossible : on garde les dimensions précédentes
        );
      };
      const mf = ml.creerChampMaths(courant.current.latex);
      champ = mf;
      mf.addEventListener('input', () => {
        // Le LaTeX part tout de suite (rien n'est perdu si on exporte ou ferme avant la fin du rendu).
        courant.current = { ...courant.current, latex: mf.value };
        rappel.current(courant.current);
        mesurer(mf.value);
      });
      mesurer(courant.current.latex); // nouvelle expression (10 × 8 mm provisoires) ou rouverte sans changement
      hote.current.appendChild(mf);
      setPret(true);
      setTimeout(() => { if (!vivant) return; mf.focus(); ml.afficherClavier(true); }, 0); // pas de clavier orphelin si déjà fermé
    })();
    return () => {
      vivant = false;
      vivantRef.current = false;
      void import('../../maths/mathlive').then(ml => ml.afficherClavier(false));
      champ?.remove();
    };
  }, []);

  const terminer = async () => {
    await rendu.current;
    if (vivantRef.current) onFin(courant.current);
  };

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
        <button type="button" className="plai-btn min-h-[44px] !text-base" onMouseDown={e => e.preventDefault()} onClick={basculer}>
          {complet ? 'Clavier simple' : 'Clavier complet'}
        </button>
        <button type="button" className="plai-btn min-h-[44px] !text-base" onMouseDown={e => e.preventDefault()} onClick={terminer}>Terminé</button>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { EtatClavier } from '../../maths/mathlive';
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
  const [echec, setEchec] = useState(false);
  const [clavier, setClavier] = useState<EtatClavier>({ visible: false, haut: null });

  // Dernier calcul de dimensions en cours : « Terminé » l'attend pour valider la taille réelle.
  const rendu = useRef<Promise<void>>(Promise.resolve());
  const vivantRef = useRef(true);

  useEffect(() => {
    let vivant = true;
    vivantRef.current = true;
    let champ: HTMLElement | null = null;
    let tour = 0;
    let arreterSuivi: (() => void) | undefined;
    (async () => {
      try {
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
      arreterSuivi = ml.suivreClavier(setClavier);
      setPret(true);
      setTimeout(() => { if (!vivant) return; mf.focus(); ml.afficherClavier(true); }, 0); // pas de clavier orphelin si déjà fermé
      } catch {
        // Fichier du clavier introuvable (nouvelle version publiée pendant que la page était ouverte, ou réseau coupé) :
        // on le dit au lieu d'afficher « Chargement… » pour toujours.
        if (vivant) setEchec(true);
      }
    })();
    return () => {
      vivant = false;
      vivantRef.current = false;
      arreterSuivi?.();
      void import('../../maths/mathlive').then(ml => ml.afficherClavier(false), () => undefined);
      champ?.remove();
    };
  }, []);

  const terminer = async () => {
    await rendu.current;
    if (vivantRef.current) onFin(courant.current);
  };

  const basculer = async () => {
    try {
      const ml = await import('../../maths/mathlive');
      ml.choisirClavier(!complet);
      setComplet(!complet);
    } catch {
      setEchec(true);
    }
  };

  // Ferme (ou rouvre) le clavier sans quitter l'expression : le champ reste là, on peut le rouvrir.
  const montrerClavier = async (visible: boolean) => {
    try {
      const ml = await import('../../maths/mathlive');
      ml.afficherClavier(visible);
    } catch {
      setEchec(true);
    }
  };

  return (
    <div style={{ position: 'absolute', left: o.x * pxMm, top: o.y * pxMm, zIndex: 10, minWidth: 60 * pxMm }}>
      <div ref={hote} style={{ fontSize: ptVersMm(o.taillePt) * pxMm, color: o.couleur, outline: '1px dashed #0f6e56', background: 'rgba(255,255,255,0.85)' }}>
        {!pret && !echec && <span className="text-[var(--text2)]">Chargement du clavier mathématique…</span>}
      </div>
      {echec && (
        <div className="plai-error mt-1 max-w-[28rem]" role="alert">
          Le clavier mathématique n’a pas pu être chargé : une nouvelle version de l’application vient sans doute d’être publiée, ou la connexion est coupée.
          Recharger la page règle le problème ; le travail est enregistré.
          <div className="mt-2">
            <button type="button" className="plai-btn min-h-[44px] !text-base" onMouseDown={e => e.preventDefault()} onClick={() => window.location.reload()}>Recharger la page</button>
          </div>
        </div>
      )}
      {/* Cartouche collé au bord haut du clavier, à droite : toujours au même endroit, quelle que soit la hauteur du clavier. */}
      {clavier.visible && clavier.haut !== null && createPortal(
        <button
          type="button"
          aria-label="Fermer le clavier mathématique"
          className="plai-btn min-h-[44px] !rounded-b-none !px-4 !text-base shadow-lg"
          style={{ position: 'fixed', right: 16, top: Math.max(8, clavier.haut - 44), zIndex: 200 }}
          onMouseDown={e => e.preventDefault()}
          onClick={() => void montrerClavier(false)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
          Fermer le clavier
        </button>,
        document.body,
      )}
      <div className="mt-1 flex gap-2">
        {!clavier.visible && pret && (
          <button type="button" className="plai-btn min-h-[44px] !text-base" onMouseDown={e => e.preventDefault()} onClick={() => void montrerClavier(true)}>
            Afficher le clavier
          </button>
        )}
        <button type="button" className="plai-btn min-h-[44px] !text-base" onMouseDown={e => e.preventDefault()} onClick={basculer}>
          {complet ? 'Clavier simple' : 'Clavier complet'}
        </button>
        <button type="button" className="plai-btn min-h-[44px] !text-base" onMouseDown={e => e.preventDefault()} onClick={terminer}>Terminé</button>
      </div>
    </div>
  );
}

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  caractereSaisi, cle, cleDepart, directionSaisie, ecrireCellule, effacerCalculatrice, estLigneARecopier, geometrieOperation,
  libelleCellule, ligneSuivante, lireCle, saisieValide, taperCalculatrice, valeurCellule, voisin, type Direction,
} from '../../maths/operation';
import type { OperationPosee } from '../../model/types';
import { PaveNumerique } from './PaveNumerique';

type Props = { o: OperationPosee; pxMm: number; onChange: (o: OperationPosee) => void; onFin: (o: OperationPosee) => void };

const FLECHES: Record<string, Direction> = { ArrowLeft: 'gauche', ArrowRight: 'droite', ArrowUp: 'haut', ArrowDown: 'bas' };

export function EditeurOperation({ o, pxMm, onChange, onFin }: Props) {
  const g = useMemo(() => geometrieOperation(o), [o]);
  const [focus, setFocusEtat] = useState(() => cleDepart(o));
  // Le pavé lit la case active ici, pas dans l'état : deux touches rapides avant un rendu ne se perdent pas.
  const focusRef = useRef(focus);
  const setFocus = (k: string) => {
    focusRef.current = k;
    setFocusEtat(k);
  };
  const champs = useRef(new Map<string, HTMLInputElement>());
  const grille = useRef<HTMLDivElement>(null);
  const [cote, setCote] = useState<'gauche' | 'droite'>('droite');
  useLayoutEffect(() => {
    const r = grille.current?.getBoundingClientRect();
    if (r) setCote(r.left + r.width / 2 < window.innerWidth / 2 ? 'droite' : 'gauche');
  }, [o.x, pxMm]);
  const courant = useRef(o);
  courant.current = o;

  useEffect(() => {
    const t = setTimeout(() => champs.current.get(focus)?.focus(), 0);
    return () => clearTimeout(t);
  }, [focus]);

  const deplacer = (k: string, d: Direction) => {
    const { zone, index } = lireCle(k);
    const v = voisin(courant.current, zone, index, d);
    if (v) setFocus(v);
  };

  const ecrire = (k: string, ch: string) => {
    const { zone, index } = lireCle(k);
    if (ch !== '' && !saisieValide(ch)) return;
    const ligne = Math.floor(index / courant.current.colonnes);
    if (zone === 'case' && estLigneARecopier(courant.current, ligne)) {
      // Nombre à recopier : tapé dans l'ordre de lecture, calé à droite ; le curseur reste sur les unités.
      courant.current = ch === '' ? effacerCalculatrice(courant.current, ligne) : taperCalculatrice(courant.current, ligne, ch);
      onChange(courant.current);
      setFocus(cle('case', ligne * courant.current.colonnes + courant.current.colonnes - 1));
      return;
    }
    // courant mis à jour tout de suite : deux saisies avant le rendu suivant ne s'écrasent pas.
    courant.current = ecrireCellule(courant.current, zone, index, ch);
    onChange(courant.current);
    if (ch === '') return;
    const d = directionSaisie(courant.current, zone);
    if (d) deplacer(k, d);
  };

  const suivant = () => {
    const v = ligneSuivante(courant.current, focusRef.current);
    if (v) setFocus(v);
  };

  return (
    <>
      <div ref={grille} style={{ position: 'absolute', left: o.x * pxMm, top: o.y * pxMm, width: g.largeur * pxMm, height: g.hauteur * pxMm, outline: '1px dashed #0f6e56', zIndex: 10 }}>
        {g.cellules.map(c => {
          const k = cle(c.zone, c.index);
          return (
            <input
              key={k}
              ref={el => { if (el) champs.current.set(k, el); else champs.current.delete(k); }}
              value={valeurCellule(o, c.zone, c.index)}
              // Pas de clavier de la tablette : le pavé à l'écran sert à écrire (un clavier physique marche toujours).
              inputMode="none"
              aria-label={libelleCellule(o, c.zone, c.index)}
              onFocus={e => { setFocus(k); e.currentTarget.select(); }}
              onChange={e => ecrire(k, caractereSaisi(valeurCellule(courant.current, c.zone, c.index), e.target.value))}
              onKeyDown={e => {
                const d = FLECHES[e.key];
                if (d) { e.preventDefault(); deplacer(k, d); }
                else if (e.key === 'Enter') { e.preventDefault(); suivant(); }
                else if (e.key === 'Escape') { e.preventDefault(); onFin(courant.current); }
              }}
              style={{
                position: 'absolute', left: c.x * pxMm, top: c.y * pxMm, width: c.l * pxMm, height: c.h * pxMm,
                textAlign: 'center', fontFamily: 'Arial, sans-serif', fontSize: (c.zone === 'retenue' ? 4 : 7) * pxMm,
                color: o.couleur, background: focus === k ? 'rgba(15,110,86,0.15)' : 'transparent', border: 'none', padding: 0,
              }}
            />
          );
        })}
      </div>
      <PaveNumerique
        cote={cote}
        onChiffre={ch => ecrire(focusRef.current, ch)}
        onEffacer={() => ecrire(focusRef.current, '')}
        onDirection={d => deplacer(focusRef.current, d)}
        onSuivant={suivant}
        onFin={() => onFin(courant.current)}
      />
    </>
  );
}

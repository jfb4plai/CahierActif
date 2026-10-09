import { useEffect, useMemo, useRef, useState } from 'react';
import {
  caractereSaisi, cle, cleDepart, directionSaisie, ecrireCellule, geometrieOperation, libelleCellule, lireCle, saisieValide,
  valeurCellule, voisin, type Direction,
} from '../../maths/operation';
import type { OperationPosee } from '../../model/types';
import { PaveNumerique } from './PaveNumerique';

type Props = { o: OperationPosee; pxMm: number; onChange: (o: OperationPosee) => void; onFin: (o: OperationPosee) => void };

const FLECHES: Record<string, Direction> = { ArrowLeft: 'gauche', ArrowRight: 'droite', ArrowUp: 'haut', ArrowDown: 'bas' };

export function EditeurOperation({ o, pxMm, onChange, onFin }: Props) {
  const g = useMemo(() => geometrieOperation(o), [o]);
  const [focus, setFocus] = useState(() => cleDepart(o));
  const champs = useRef(new Map<string, HTMLInputElement>());
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
    // courant mis à jour tout de suite : deux saisies avant le rendu suivant ne s'écrasent pas.
    courant.current = ecrireCellule(courant.current, zone, index, ch);
    onChange(courant.current);
    if (ch === '') return;
    const d = directionSaisie(courant.current, zone);
    if (d) deplacer(k, d);
  };

  return (
    <>
      <div style={{ position: 'absolute', left: o.x * pxMm, top: o.y * pxMm, width: g.largeur * pxMm, height: g.hauteur * pxMm, outline: '1px dashed #0f6e56', zIndex: 10 }}>
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
                else if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); onFin(courant.current); }
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
        onChiffre={ch => ecrire(focus, ch)}
        onEffacer={() => ecrire(focus, '')}
        onDirection={d => deplacer(focus, d)}
        onFin={() => onFin(courant.current)}
      />
    </>
  );
}

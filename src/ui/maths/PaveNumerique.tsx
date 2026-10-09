import type { Direction } from '../../maths/operation';

type Props = { onChiffre: (c: string) => void; onEffacer: () => void; onDirection: (d: Direction) => void; onFin: () => void };

// onMouseDown + preventDefault : le bouton ne vole pas le focus de la case en cours.
const garde = (e: React.MouseEvent) => e.preventDefault();

export function PaveNumerique({ onChiffre, onEffacer, onDirection, onFin }: Props) {
  const b = 'plai-btn min-h-[56px] min-w-[56px] !text-2xl'; // ! : .plai-btn impose 14px
  const chiffre = (c: string) => <button key={c} type="button" className={b} onMouseDown={garde} onClick={() => onChiffre(c)}>{c}</button>;
  return (
    <div role="group" aria-label="Pavé numérique"
      className="fixed bottom-4 left-1/2 z-[60] grid -translate-x-1/2 grid-cols-4 gap-2 rounded-xl bg-[var(--surface)] p-3 shadow-lg">
      {['7', '8', '9'].map(chiffre)}
      <button type="button" className={b} aria-label="Case de gauche" onMouseDown={garde} onClick={() => onDirection('gauche')}>←</button>
      {['4', '5', '6'].map(chiffre)}
      <button type="button" className={b} aria-label="Case de droite" onMouseDown={garde} onClick={() => onDirection('droite')}>→</button>
      {['1', '2', '3'].map(chiffre)}
      <button type="button" className={b} aria-label="Case du dessus" onMouseDown={garde} onClick={() => onDirection('haut')}>↑</button>
      {chiffre('0')}
      <button type="button" className={`${b} col-span-2`} onMouseDown={garde} onClick={onEffacer}>Effacer</button>
      <button type="button" className={b} aria-label="Case du dessous" onMouseDown={garde} onClick={() => onDirection('bas')}>↓</button>
      <button type="button" className={`${b} col-span-4`} onMouseDown={garde} onClick={onFin}>Terminé</button>
    </div>
  );
}

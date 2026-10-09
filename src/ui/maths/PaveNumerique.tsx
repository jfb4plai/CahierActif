import type { Direction } from '../../maths/operation';

type Props = {
  cote: 'gauche' | 'droite'; // côté de l'écran opposé à l'opération, pour ne jamais la cacher
  onChiffre: (c: string) => void;
  onEffacer: () => void;
  onDirection: (d: Direction) => void;
  onSuivant: () => void;
  onFin: () => void;
};

// onMouseDown + preventDefault : le bouton ne vole pas le focus de la case en cours.
const garde = (e: React.MouseEvent) => e.preventDefault();

export function PaveNumerique({ cote, onChiffre, onEffacer, onDirection, onSuivant, onFin }: Props) {
  const b = 'plai-btn min-h-[52px] min-w-[52px] !px-0 !text-2xl'; // ! : .plai-btn impose 14px ; 52 px > cible tactile 44 px
  const mot = 'plai-btn min-h-[52px] !px-1 !text-base !whitespace-normal leading-tight'; // libellés en mots : pavé étroit, l'opération reste visible
  const chiffre = (c: string) => <button key={c} type="button" className={b} onMouseDown={garde} onClick={() => onChiffre(c)}>{c}</button>;
  return (
    <div role="group" aria-label="Pavé numérique"
      className={`fixed bottom-4 ${cote === 'droite' ? 'right-4' : 'left-4'} z-[60] grid grid-cols-4 gap-2 rounded-xl bg-[var(--surface)] p-3 shadow-lg`}>
      {['7', '8', '9'].map(chiffre)}
      <button type="button" className={b} aria-label="Case de gauche" onMouseDown={garde} onClick={() => onDirection('gauche')}>←</button>
      {['4', '5', '6'].map(chiffre)}
      <button type="button" className={b} aria-label="Case de droite" onMouseDown={garde} onClick={() => onDirection('droite')}>→</button>
      {['1', '2', '3'].map(chiffre)}
      <button type="button" className={b} aria-label="Case du dessus" onMouseDown={garde} onClick={() => onDirection('haut')}>↑</button>
      {chiffre('0')}
      <button type="button" className={`${mot} col-span-2`} onMouseDown={garde} onClick={onEffacer}>Effacer</button>
      <button type="button" className={b} aria-label="Case du dessous" onMouseDown={garde} onClick={() => onDirection('bas')}>↓</button>
      <button type="button" className={`${mot} col-span-2`} onMouseDown={garde} onClick={onSuivant}>Nombre suivant</button>
      <button type="button" className={`${mot} col-span-2`} onMouseDown={garde} onClick={onFin}>Terminé</button>
    </div>
  );
}

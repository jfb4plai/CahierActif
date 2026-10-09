import type { ObjetMaths } from '../../model/types';
import { EditeurExpression } from './EditeurExpression';
import { EditeurFraction } from './EditeurFraction';
import { EditeurOperation } from './EditeurOperation';
import { PanneauRepere } from './PanneauRepere';

type Props = { o: ObjetMaths; pxMm: number; onChange: (o: ObjetMaths) => void; onFin: (o: ObjetMaths) => void };

export function EditionMaths({ o, pxMm, onChange, onFin }: Props) {
  switch (o.type) {
    case 'operation': return <EditeurOperation o={o} pxMm={pxMm} onChange={onChange} onFin={onFin} />;
    case 'fraction': return <EditeurFraction o={o} pxMm={pxMm} onChange={onChange} onFin={onFin} />;
    case 'expression': return <EditeurExpression o={o} pxMm={pxMm} onChange={onChange} onFin={onFin} />;
    case 'repere': return <PanneauRepere o={o} onChange={onChange} onFin={onFin} />;
  }
}

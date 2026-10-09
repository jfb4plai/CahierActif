import { useState } from 'react';
import { chiffresDiviseurMax, decimalesPermises, operateursPour, type ParamsOperation } from '../../maths/operation';
import type { Niveau, Operateur } from '../../model/types';

const NOMS: Record<Operateur, string> = { '+': 'Addition (+)', '-': 'Soustraction (−)', '×': 'Multiplication (×)', '÷': 'Division (÷)' };

type Props = { niveau: Niveau; onValider: (p: ParamsOperation) => void; onAnnuler: () => void };

function Nombre({ id, label, aide, valeur, min, max, onChange }: { id: string; label: string; aide: string; valeur: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="mb-3">
      <label htmlFor={id} className="block font-semibold">{label}</label>
      <div className="flex items-center gap-2">
        <button type="button" className="plai-btn min-h-[44px] min-w-[44px]" aria-label={`${label} : moins`} onClick={() => onChange(Math.max(min, valeur - 1))}>−</button>
        <input id={id} type="number" inputMode="numeric" min={min} max={max} value={valeur} className="plai-input w-20 text-center"
          onChange={e => onChange(Math.min(max, Math.max(min, Number(e.target.value) || min)))} />
        <button type="button" className="plai-btn min-h-[44px] min-w-[44px]" aria-label={`${label} : plus`} onClick={() => onChange(Math.min(max, valeur + 1))}>+</button>
      </div>
      <p className="text-[var(--text2)]">{aide}</p>
    </div>
  );
}

export function DialogueOperation({ niveau, onValider, onAnnuler }: Props) {
  const ops = operateursPour(niveau);
  const [operateur, setOperateur] = useState<Operateur>(ops[0]);
  const [colonnes, setColonnes] = useState(3);
  const [nombres, setNombres] = useState(2); // + et − : nombres à poser
  const [lignesCalcul, setLignesCalcul] = useState(4); // × et ÷
  const [diviseur, setDiviseur] = useState(1);
  const [decimales, setDecimales] = useState(0);
  const [couleurs, setCouleurs] = useState(true);

  const valider = () => {
    const lignes = operateur === '+' || operateur === '-' ? nombres + 1 : lignesCalcul;
    onValider({ operateur, colonnes, lignes, virgule: decimales > 0 ? decimales : null, chiffresDiviseur: diviseur, couleurs });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 p-4" role="dialog" aria-modal="true" aria-labelledby="titre-op">
      <div className="plai-card max-h-[90vh] w-full max-w-md overflow-auto bg-[var(--surface)] p-5">
        <h2 id="titre-op" className="mb-3 font-serif text-2xl">Poser une opération</h2>
        <fieldset className="mb-3">
          <legend className="font-semibold">Opération</legend>
          {ops.map(o => (
            <label key={o} className="flex min-h-[44px] items-center gap-3">
              <input type="radio" name="operateur" className="h-5 w-5" checked={operateur === o} onChange={() => setOperateur(o)} />
              {NOMS[o]}
            </label>
          ))}
        </fieldset>
        <Nombre id="op-col" label="Nombre de colonnes" valeur={colonnes} min={2} max={8} onChange={setColonnes}
          aide="Une colonne par chiffre du plus grand nombre (résultat compris). Exemple : 245 + 378 = 623 → 3 colonnes." />
        {(operateur === '+' || operateur === '-') && (
          <Nombre id="op-nb" label="Nombres à poser" valeur={nombres} min={2} max={4} onChange={setNombres}
            aide="Combien de nombres l’un sous l’autre. Une ligne de résultat est ajoutée sous la barre." />
        )}
        {operateur === '×' && (
          <Nombre id="op-l" label="Lignes de calcul" valeur={lignesCalcul} min={3} max={6} onChange={setLignesCalcul}
            aide="Les deux facteurs, puis les produits partiels et le résultat. Exemple : 46 × 23 → 5 lignes." />
        )}
        {operateur === '÷' && (
          <>
            <Nombre id="op-l" label="Lignes sous le dividende" valeur={lignesCalcul} min={2} max={8} onChange={setLignesCalcul}
              aide="Place pour les soustractions successives et les restes." />
            <Nombre id="op-div" label="Chiffres du diviseur" valeur={diviseur} min={1} max={chiffresDiviseurMax(niveau)} onChange={setDiviseur}
              aide="Exemple : 856 ÷ 4 → 1 chiffre." />
          </>
        )}
        {decimalesPermises(niveau) && (
          <Nombre id="op-dec" label="Chiffres après la virgule" valeur={decimales} min={0} max={3} onChange={setDecimales}
            aide="0 pour des nombres entiers. Un trait rouge sépare la partie entière des décimales." />
        )}
        <label className="mb-1 flex min-h-[44px] items-center gap-3">
          <input type="checkbox" className="h-5 w-5" checked={couleurs} onChange={e => setCouleurs(e.target.checked)} />
          Colonnes colorées
        </label>
        <p className="mb-4 text-[var(--text2)]">Unités en bleu, dizaines en vert, centaines en rouge : aide à garder les chiffres alignés.</p>
        <div className="flex gap-2">
          <button type="button" className="plai-btn min-h-[44px]" onClick={valider}>Poser l’opération</button>
          <button type="button" className="plai-btn min-h-[44px]" onClick={onAnnuler}>Annuler</button>
        </div>
      </div>
    </div>
  );
}

import { createContext, useEffect, useRef, useState } from 'react';

/** Demande le code d'adulte quand le mode verrouillé est actif ; sans verrou, répond tout de suite « oui ». */
export const VerrouContexte = createContext<{ actif: boolean; demander: () => Promise<boolean> }>({ actif: false, demander: async () => true });

type Props = { onValider: (code: string) => Promise<boolean>; onAnnuler: () => void };

export function DialogueCode({ onValider, onAnnuler }: Props) {
  const [code, setCode] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const champ = useRef<HTMLInputElement>(null);
  useEffect(() => champ.current?.focus(), []);

  const soumettre = async () => {
    if (!/^\d{4}$/.test(code)) { setErreur('Le code a 4 chiffres.'); return; }
    if (await onValider(code)) return;
    setCode('');
    setErreur('Ce n’est pas le bon code.');
    champ.current?.focus();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" role="presentation"
      onKeyDown={e => { if (e.key === 'Escape') onAnnuler(); }}>
      <form className="carte-flottante w-full max-w-sm p-5" role="dialog" aria-modal="true" aria-labelledby="titre-code"
        onSubmit={e => { e.preventDefault(); void soumettre(); }}>
        <h2 id="titre-code" className="mb-2 text-xl font-bold">Code d’adulte</h2>
        <p className="mb-3 text-base text-[var(--text2)]">Le mode verrouillé est actif. Un adulte écrit le code à 4 chiffres pour continuer.</p>
        <label className="mb-1 block text-base font-medium" htmlFor="champ-code">Code</label>
        <input
          id="champ-code" ref={champ} className="plai-input min-h-[52px] w-full text-center text-2xl tracking-[0.5em]"
          type="password" inputMode="numeric" autoComplete="off" maxLength={4} value={code}
          aria-invalid={!!erreur} aria-describedby={erreur ? 'erreur-code' : undefined}
          onChange={e => { setCode(e.target.value.replace(/\D/g, '')); setErreur(null); }}
        />
        {erreur && <p id="erreur-code" role="alert" className="mt-2 text-base text-[#b91c1c]">{erreur}</p>}
        <div className="mt-4 flex gap-2">
          <button type="submit" className="plai-btn min-h-[48px]">Continuer</button>
          <button type="button" className="plai-btn-secondaire min-h-[48px]" onClick={onAnnuler}>Annuler</button>
        </div>
      </form>
    </div>
  );
}

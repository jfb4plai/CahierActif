import { useState } from 'react';
import type { Reglages as R } from '../lib/reglages';
import type { ModeEntree, Niveau } from '../model/types';

const NIVEAUX: { id: Niveau; libelle: string; aide: string }[] = [
  { id: 'p1p2', libelle: 'P1-P2', aide: 'Grands boutons, peu d’outils : stylo, gomme, texte.' },
  { id: 'p3p6', libelle: 'P3-P6', aide: 'Tous les outils du fondamental, dont la gomme fine et le déplacement.' },
  { id: 'secondaire', libelle: 'Secondaire (S1-S6)', aide: 'Tous les outils, y compris ceux réservés au secondaire dans les prochaines versions.' },
];

const MODES: { id: ModeEntree; libelle: string; aide: string }[] = [
  { id: 'stylet', libelle: 'Tablette avec stylet', aide: 'Dès que le stylet touche l’écran, le doigt ne trace plus : il sert à faire défiler. La paume posée n’écrit pas.' },
  { id: 'souris', libelle: 'Ordinateur ou tablette au doigt', aide: 'La souris, le pavé tactile et le doigt tracent tous. Utilisez l’outil Main pour faire défiler.' },
];

type Props = { initial: R | null; onValider: (r: R) => void };

export function Reglages({ initial, onValider }: Props) {
  const [niveau, setNiveau] = useState<Niveau>(initial?.niveau ?? 'p3p6');
  const [mode, setMode] = useState<ModeEntree>(initial?.modeEntree ?? 'stylet');

  return (
    <section className="plai-section mx-auto max-w-2xl p-4">
      <h1 className="mb-4 font-serif text-3xl">Réglages</h1>
      <fieldset className="plai-card mb-4 p-4">
        <legend className="font-semibold">Niveau de l’élève</legend>
        <p className="mb-2 text-[var(--text2)]">Le niveau décide des outils affichés. Moins d’outils = moins de distraction pour les plus jeunes.</p>
        {NIVEAUX.map(n => (
          <label key={n.id} className="mb-2 flex items-start gap-3">
            <input type="radio" name="niveau" className="mt-2 h-5 w-5" checked={niveau === n.id} onChange={() => setNiveau(n.id)} />
            <span><strong>{n.libelle}</strong><span className="block text-[var(--text2)]">{n.aide}</span></span>
          </label>
        ))}
      </fieldset>
      <fieldset className="plai-card mb-4 p-4">
        <legend className="font-semibold">Appareil utilisé</legend>
        <p className="mb-2 text-[var(--text2)]">Ce réglage décide de ce que fait le doigt sur l’écran.</p>
        {MODES.map(m => (
          <label key={m.id} className="mb-2 flex items-start gap-3">
            <input type="radio" name="mode" className="mt-2 h-5 w-5" checked={mode === m.id} onChange={() => setMode(m.id)} />
            <span><strong>{m.libelle}</strong><span className="block text-[var(--text2)]">{m.aide}</span></span>
          </label>
        ))}
      </fieldset>
      <button type="button" className="plai-btn min-h-[44px]" onClick={() => onValider({ niveau, modeEntree: mode })}>Valider</button>
    </section>
  );
}

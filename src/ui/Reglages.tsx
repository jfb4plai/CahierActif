import { useState } from 'react';
import type { PositionColonne, Reglages as R } from '../lib/reglages';
import type { ModeEntree, Niveau } from '../model/types';

const NIVEAUX: { id: Niveau; libelle: string; aide: string }[] = [
  { id: 'p1p2', libelle: 'P1-P2', aide: 'Grands boutons, peu d’outils : stylo, gomme, texte.' },
  { id: 'p3p6', libelle: 'P3-P6', aide: 'Tous les outils du fondamental, dont la sélection, le surligneur, les formes et la gomme fine, dans une colonne d’outils.' },
  { id: 'secondaire', libelle: 'Secondaire (S1-S6)', aide: 'Tous les outils, y compris ceux réservés au secondaire dans les prochaines versions.' },
];

const MODES: { id: ModeEntree; libelle: string; aide: string }[] = [
  { id: 'stylet', libelle: 'Tablette avec stylet', aide: 'Dès que le stylet touche l’écran, le doigt ne trace plus : il sert à faire défiler. La paume posée n’écrit pas.' },
  { id: 'souris', libelle: 'Ordinateur ou tablette au doigt', aide: 'La souris, le pavé tactile et le doigt tracent tous. Utilisez l’outil Main pour faire défiler.' },
];

const COLONNES: { id: PositionColonne; libelle: string; aide: string }[] = [
  { id: 'gauche', libelle: 'À gauche', aide: 'Pour écrire de la main droite : la main qui écrit ne cache pas les outils.' },
  { id: 'droite', libelle: 'À droite', aide: 'Pour écrire de la main gauche : la main qui écrit ne cache pas les outils.' },
];

type Props = { initial: R | null; onValider: (r: R) => void };

export function Reglages({ initial, onValider }: Props) {
  const [niveau, setNiveau] = useState<Niveau>(initial?.niveau ?? 'p3p6');
  const [mode, setMode] = useState<ModeEntree>(initial?.modeEntree ?? 'stylet');
  const [colonne, setColonne] = useState<PositionColonne>(initial?.colonne ?? 'gauche');

  return (
    <section className="plai-section mx-auto max-w-2xl p-4">
      <h1 className="titre-accueil mb-4">Réglages</h1>
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
      {niveau !== 'p1p2' && (
        <fieldset className="plai-card mb-4 p-4">
          <legend className="font-semibold">Côté de la colonne d’outils</legend>
          <p className="mb-2 text-[var(--text2)]">À partir de P3, les outils sont rangés par groupes dans une colonne à côté de la page. Ce réglage choisit son côté.</p>
          {COLONNES.map(c => (
            <label key={c.id} className="mb-2 flex items-start gap-3">
              <input type="radio" name="colonne" className="mt-2 h-5 w-5" checked={colonne === c.id} onChange={() => setColonne(c.id)} />
              <span><strong>{c.libelle}</strong><span className="block text-[var(--text2)]">{c.aide}</span></span>
            </label>
          ))}
        </fieldset>
      )}
      <button type="button" className="plai-btn min-h-[44px]" onClick={() => onValider({ niveau, modeEntree: mode, colonne })}>Valider</button>
    </section>
  );
}

import type { ReactNode } from 'react';
import type { OutilId } from '../model/outils';

// Icônes décoratives : le libellé du bouton porte le sens. Traits arrondis, couleur du texte.
function Svg({ taille, children }: { taille: number; children: ReactNode }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
      {children}
    </svg>
  );
}

const CHEMINS: Record<OutilId, ReactNode> = {
  main: <><path d="M8 13V6a1.5 1.5 0 0 1 3 0v5" /><path d="M11 11V4.5a1.5 1.5 0 0 1 3 0V11" /><path d="M14 10.5V6a1.5 1.5 0 0 1 3 0v6" /><path d="M17 9.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1.4a6 6 0 0 1-4.6-2.2L4.6 14a1.5 1.5 0 0 1 2.3-1.9L8 13.4" /></>,
  selectionner: <><path d="M5 3l14 7-6 2.2L10.8 18z" /><path d="M13 12.5l5 5" /></>,
  stylo: <><path d="M4 20l1-4L16.5 4.5a2 2 0 0 1 3 0l0 0a2 2 0 0 1 0 3L8 19z" /><path d="M14 7l3 3" /></>,
  surligneur: <><path d="M9 14l6-6 3.5 3.5-6 6H9z" /><path d="M15.5 7.5l1.2-1.2a1.5 1.5 0 0 1 2.1 0l.9.9a1.5 1.5 0 0 1 0 2.1L18.5 10.5" /><path d="M4 21h16" /></>,
  formes: <><circle cx="8" cy="8" r="4" /><rect x="12" y="12" width="8" height="8" rx="1.5" /></>,
  droite: <><path d="M4 19L20 5" /><circle cx="7.5" cy="16" r="1.4" /><circle cx="16.5" cy="8" r="1.4" /></>,
  'gomme-objet': <><path d="M3.5 14l8-8.5 7 7-6 6.5H8z" /><path d="M11 20h9" /></>,
  'gomme-partielle': <><path d="M3.5 14l8-8.5 7 7-6 6.5H8z" /><path d="M11 20h2M15 20h2M19 20h1" /></>,
  texte: <><path d="M5 7V5h14v2" /><path d="M12 5v14" /><path d="M9 19h6" /></>,
  operation: <><path d="M12 4v8M8 8h8" /><path d="M8 17h8" /></>,
  fraction: <><path d="M10 6h4" /><path d="M5 12h14" /><path d="M10 18h4" /></>,
  expression: <><path d="M4 13l3 4 5-12h8" /></>,
  repere: <><path d="M5 4v16h15" /><path d="M5 20l7-9 3 3 5-7" /></>,
};

export function IconeOutil({ id, taille = 22 }: { id: OutilId; taille?: number }) {
  return <Svg taille={taille}>{CHEMINS[id]}</Svg>;
}

export type NomIconeUi = 'rapporteur' | 'compas' | 'regle' | 'equerre' | 'annuler' | 'retablir' | 'retour' | 'telecharger' | 'fichier' | 'bas' | 'haut' | 'pages' | 'moins' | 'plus';

const CHEMINS_UI: Record<NomIconeUi, ReactNode> = {
  rapporteur: <><path d="M3 18a9 9 0 0 1 18 0z" /><path d="M12 18v-3M6.5 14.5l1.7 1.2M17.5 14.5l-1.7 1.2" /></>,
  compas: <><path d="M12 3v3" /><path d="M12 6L6 20M12 6l6 14" /><path d="M8.5 14h7" /></>,
  regle: <><rect x="3" y="8" width="18" height="8" rx="1.5" /><path d="M7 8v3M11 8v4M15 8v3M19 8v4" /></>,
  equerre: <><path d="M5 4v16h16z" /><path d="M5 14h4v4" /></>,
  annuler: <><path d="M9 14L4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></>,
  retablir: <><path d="M15 14l5-5-5-5" /><path d="M20 9H10a6 6 0 0 0 0 12h3" /></>,
  retour: <><path d="M15 5l-7 7 7 7" /></>,
  telecharger: <><path d="M12 4v11" /><path d="M7 11l5 5 5-5" /><path d="M5 20h14" /></>,
  fichier: <><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5" /></>,
  bas: <><path d="M6 9l6 6 6-6" /></>,
  haut: <><path d="M6 15l6-6 6 6" /></>,
  pages: <><rect x="4" y="3" width="12" height="16" rx="1.5" /><path d="M8 21h11a1 1 0 0 0 1-1V8" /></>,
  moins: <><path d="M6 12h12" /></>,
  plus: <><path d="M12 6v12M6 12h12" /></>,
};

export function IconeUi({ nom, taille = 20 }: { nom: NomIconeUi; taille?: number }) {
  return <Svg taille={taille}>{CHEMINS_UI[nom]}</Svg>;
}

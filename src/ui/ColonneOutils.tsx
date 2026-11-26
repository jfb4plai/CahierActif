import type { PositionColonne } from '../lib/reglages';
import { groupesPour } from '../model/outils';
import type { PropsOutils } from './BarreOutils';
import { IconeOutil, IconeUi } from './iconesOutils';

type Props = PropsOutils & {
  position: PositionColonne;
  /** Colonne posée par-dessus la page (aperçu au survol) : ni collée ni décalée. */
  flottante?: boolean;
  /** Bouton du haut : replier la colonne, ou la garder dépliée quand on la voit en aperçu. */
  bouton?: { libelle: string; onClick: () => void; deplie: boolean };
};

export const LARGEUR_COLONNE_PX = 212;

const AIDE_GEOMETRIE = {
  regle: 'Poser ou retirer la règle. Le stylo commencé près d’un bord trace une ligne droite.',
  equerre: 'Poser ou retirer l’équerre. Le stylo commencé près d’un bord trace une ligne droite.',
  rapporteur: 'Poser ou retirer le rapporteur. Le stylo commencé près de sa base trace une ligne droite.',
  compas: 'Poser ou retirer le compas. Glisser la mine (le rond plein) autour de la pointe trace un arc.',
} as const;

// Outil actif : plein, bleu, texte blanc, ombre portée, gras. Tous les autres : gris doux. Le contraste ne repose pas
// sur la seule couleur (gras, ombre, anneau).
const BASE = 'inline-flex min-h-[52px] items-center rounded-2xl px-4 text-lg leading-tight transition-colors duration-150 disabled:opacity-40';
export const OUTIL_ACTIF = BASE + ' bg-[#1d4ed8] font-bold text-white shadow-md ring-2 ring-[#1e3a8a]/40';
export const OUTIL_GRIS = BASE + ' bg-[#eceae3] font-medium text-[#55514a] hover:bg-[#e1ded4]';
// Choix à l'intérieur d'un outil, présentés en « segments » dans un conteneur gris : le segment choisi est blanc,
// bleu, en gras, avec un anneau bleu.
const SEG = 'inline-flex min-h-[44px] items-center justify-center rounded-xl px-4 text-lg leading-tight transition duration-150';
export const SEGMENT = SEG + ' font-medium text-[#55514a] hover:bg-white/70';
export const SEGMENT_ACTIF = SEG + ' bg-white font-bold text-[#1d4ed8] shadow ring-2 ring-[#1d4ed8]';
export const CONTENEUR_SEGMENTS = 'inline-flex flex-wrap items-center gap-1 rounded-2xl bg-[#e8e6de] p-1';
export const OPTION_CHOISIE = BASE + ' bg-white font-bold text-[#1d4ed8] shadow ring-2 ring-[#1d4ed8]';

/** Colonne des outils, rangés par groupes ; Annuler et Rétablir sont avec les gommes (groupe Corriger). */
export function ColonneOutils(p: Props) {
  return (
    <aside
      role="toolbar"
      aria-label="Outils"
      aria-orientation="vertical"
      className={`carte-flottante flex shrink-0 flex-col gap-3 overflow-y-auto p-2 ${p.flottante ? 'shadow-2xl ring-1 ring-[var(--border2)]' : 'sticky top-[64px] z-40 m-3 self-start'}`}
      style={{ width: LARGEUR_COLONNE_PX, maxHeight: 'calc(100vh - 76px)' }}
    >
      {p.bouton && (
        <button type="button" className="plai-btn-secondaire min-h-[44px] !px-2 !text-base" aria-expanded={p.bouton.deplie} onClick={p.bouton.onClick}>
          {p.bouton.deplie ? (p.position === 'gauche' ? '◀ ' : '▶ ') : ''}{p.bouton.libelle}
        </button>
      )}
      {groupesPour(p.niveau).map(g => (
        <section key={g.id} aria-labelledby={`groupe-${g.id}`}>
          <h2 id={`groupe-${g.id}`} className="mb-1 text-base font-semibold text-[var(--text2)]">{g.titre}</h2>
          <div className="flex flex-col gap-1.5">
            {g.outils.map(o => (
              <button key={o.id} type="button" className={(p.outil === o.id ? OUTIL_ACTIF : OUTIL_GRIS) + ' w-full justify-start gap-2.5 !px-3'} title={o.aide}
                aria-pressed={p.outil === o.id} onClick={() => p.setOutil(o.id)}>
                <IconeOutil id={o.id} />
                {o.libelle}
              </button>
            ))}
            {g.id === 'corriger' && (
              <>
                <button type="button" className={OUTIL_GRIS + ' w-full justify-start gap-2.5 !px-3'} disabled={!p.peutAnnuler} onClick={p.onAnnuler}><IconeUi nom="annuler" taille={22} />Annuler</button>
                <button type="button" className={OUTIL_GRIS + ' w-full justify-start gap-2.5 !px-3'} disabled={!p.peutRetablir} onClick={p.onRetablir}><IconeUi nom="retablir" taille={22} />Rétablir</button>
              </>
            )}
          </div>
        </section>
      ))}
      {p.geometrie && (
        <section aria-labelledby="groupe-geometrie">
          <h2 id="groupe-geometrie" className="mb-1 text-base font-semibold text-[var(--text2)]">Géométrie</h2>
          <div className="flex flex-col gap-1.5">
            {([['regle', 'Règle'], ['equerre', 'Équerre'], ['rapporteur', 'Rapporteur'], ['compas', 'Compas']] as const).map(([id, libelle]) => (
              <button key={id} type="button" className={(p.geometrie![id] ? OUTIL_ACTIF : OUTIL_GRIS) + ' w-full justify-start gap-2.5 !px-3'}
                aria-pressed={p.geometrie![id]} onClick={() => p.geometrie!.basculer(id)}
                title={AIDE_GEOMETRIE[id]}>
                <IconeUi nom={id} taille={22} />
                {libelle}
              </button>
            ))}
            <button type="button" className={(p.geometrie.loupe ? OUTIL_ACTIF : OUTIL_GRIS) + ' w-full justify-start gap-2.5 !px-3'}
              aria-pressed={p.geometrie.loupe} onClick={p.geometrie.basculerLoupe}
              title="Poser ou retirer la loupe. Elle agrandit ce qu'elle recouvre ; la glisser pour la déplacer.">
              <IconeUi nom="loupe" taille={22} />
              Loupe
            </button>
          </div>
        </section>
      )}
      {p.geometrie && (
        <section aria-labelledby="groupe-lecture">
          <h2 id="groupe-lecture" className="mb-1 text-base font-semibold text-[var(--text2)]">Lecture</h2>
          <div className="flex flex-col gap-1.5">
            <button type="button" className={(p.geometrie.cacheLigne ? OUTIL_ACTIF : OUTIL_GRIS) + ' w-full justify-start gap-2.5 !px-3'}
              aria-pressed={p.geometrie.cacheLigne} onClick={p.geometrie.basculerCache}
              title="Poser ou retirer le cache-ligne : la page est cachée sauf 1 à 3 lignes. Glisser la partie sombre pour descendre d'une ligne à l'autre.">
              <IconeUi nom="cache" taille={22} />
              Cache-ligne
            </button>
          </div>
        </section>
      )}
    </aside>
  );
}

type Couleur = { hex: string; nom: string };

type Props = {
  couleurs: Couleur[];
  choisie: string;
  onChoisir: (hex: string) => void;
  /** Diamètre d'une pastille, en px. */
  taille?: number;
};

/**
 * Pastilles de couleur. La pastille choisie se voit de trois façons, dont deux ne dépendent pas de la couleur :
 * double anneau noir (avec un espace blanc, donc visible même sur le noir et le bleu), coche au centre, taille un peu plus grande.
 * L'anneau est noir et non bleu : le bleu est réservé à l'outil et à l'option choisis.
 */
export function PaletteCouleurs({ couleurs, choisie, onChoisir, taille = 48 }: Props) {
  return (
    <div role="group" aria-label="Couleur" className="flex shrink-0 items-center gap-3 px-2">
      {couleurs.map(c => {
        const active = c.hex === choisie;
        return (
          <button
            key={c.hex}
            type="button"
            aria-label={c.nom}
            aria-pressed={active}
            title={active ? `${c.nom} (couleur choisie)` : c.nom}
            onClick={() => onChoisir(c.hex)}
            className="relative shrink-0 rounded-full border-0 p-0"
            style={{
              width: taille,
              height: taille,
              background: c.hex,
              transform: active ? 'scale(1.14)' : undefined,
              transition: 'transform 0.12s, box-shadow 0.12s',
              boxShadow: active ? '0 0 0 3px #ffffff, 0 0 0 6px #1a1a1a' : '0 0 0 1px #9ca3af',
            }}
          >
            {active && (
              <svg viewBox="0 0 24 24" width={taille * 0.6} height={taille * 0.6} aria-hidden style={{ position: 'absolute', inset: 0, margin: 'auto' }} fill="none" strokeLinecap="round" strokeLinejoin="round">
                {/* liseré sombre sous la coche blanche : lisible sur toutes les couleurs, y compris le jaune */}
                <path d="M5 12.5l4.5 4.5L19 7" stroke="#1a1a1a" strokeWidth="5.5" />
                <path d="M5 12.5l4.5 4.5L19 7" stroke="#ffffff" strokeWidth="3" />
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { estConvexe, quadComplet, redresserPhoto, tournerQuart, type Quad } from '../lib/redressement';
import type { ImageSource, TaillePage } from '../model/types';

type Props = {
  image: ImageSource;
  numeroPage: number;
  onAppliquer: (image: ImageSource, taille: TaillePage) => void;
  onAnnuler: () => void;
};

const POIGNEE_PX = 44; // cible tactile
const PAS_CLAVIER_PX = 4; // pixels de la photo par appui sur une flèche

/** Recadrer et redresser une photo : placer les quatre coins sur les quatre coins de la feuille. */
export function RedresserPhoto({ image, numeroPage, onAppliquer, onAnnuler }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [dim, setDim] = useState<{ l: number; h: number } | null>(null);
  const [quad, setQuad] = useState<Quad | null>(null);
  const [travail, setTravail] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const zone = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const u = URL.createObjectURL(new Blob([image.data], { type: image.mime }));
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [image]);

  // Échelle d'affichage : la photo entière tient dans la fenêtre.
  const maxL = Math.min(window.innerWidth - 48, 900);
  const maxH = window.innerHeight - 280;
  const s = dim ? Math.min(maxL / dim.l, maxH / dim.h, 1) : 1;

  const deplacerCoin = (i: number, x: number, y: number) =>
    setQuad(q => {
      if (!q || !dim) return q;
      const n = [...q] as Quad;
      n[i] = { x: Math.max(0, Math.min(dim.l, x)), y: Math.max(0, Math.min(dim.h, y)) };
      return n;
    });

  const saisir = (i: number, e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const bouger = (m: PointerEvent) => {
      const r = zone.current?.getBoundingClientRect();
      if (r) deplacerCoin(i, (m.clientX - r.left) / s, (m.clientY - r.top) / s);
    };
    const fin = () => {
      el.removeEventListener('pointermove', bouger);
      el.removeEventListener('pointerup', fin);
      el.removeEventListener('pointercancel', fin);
    };
    el.addEventListener('pointermove', bouger);
    el.addEventListener('pointerup', fin);
    el.addEventListener('pointercancel', fin);
  };

  const clavier = (i: number, e: React.KeyboardEvent) => {
    if (!quad) return;
    const pas = (e.shiftKey ? 10 : 1) * PAS_CLAVIER_PX;
    const d: Record<string, [number, number]> = { ArrowLeft: [-pas, 0], ArrowRight: [pas, 0], ArrowUp: [0, -pas], ArrowDown: [0, pas] };
    const v = d[e.key];
    if (!v) return;
    e.preventDefault();
    deplacerCoin(i, quad[i].x + v[0], quad[i].y + v[1]);
  };

  const valide = !!quad && estConvexe(quad);

  const appliquer = async () => {
    if (!quad || !valide) return;
    setTravail(true);
    setErreur(null);
    try {
      const r = await redresserPhoto(image, quad);
      onAppliquer(r.image, r.taille);
    } catch (e) {
      setErreur((e as Error).message || 'Le redressement a échoué. Réessayer.');
      setTravail(false);
    }
  };

  const points = quad ? quad.map(p => `${p.x * s},${p.y * s}`).join(' ') : '';

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="titre-redresser" className="fixed inset-0 z-[80] overflow-auto bg-[var(--bg)] p-4">
      <div className="mx-auto max-w-4xl">
        <h2 id="titre-redresser" className="mb-2 font-serif text-2xl">Recadrer ou redresser la page {numeroPage}</h2>
        <p className="mb-3 text-base text-[var(--text2)]">
          Placer les 4 coins numérotés sur les 4 coins de la feuille : la feuille est recadrée et remise droite.
          Le coin 1 devient le haut gauche de la page. Les annotations de cette page seront supprimées.
        </p>
        <div className="mb-3 flex flex-wrap gap-2">
          <button type="button" className="plai-btn min-h-[44px]" onClick={appliquer} disabled={!valide || travail}>{travail ? 'Traitement…' : 'Appliquer'}</button>
          <button type="button" className="plai-btn min-h-[44px]" onClick={() => setQuad(q => (q ? tournerQuart(q) : q))} disabled={travail}>Tourner d’un quart de tour</button>
          <button type="button" className="plai-btn min-h-[44px]" onClick={() => dim && setQuad(quadComplet(dim.l, dim.h))} disabled={travail}>Remettre les coins aux angles</button>
          <button type="button" className="plai-btn min-h-[44px]" onClick={onAnnuler} disabled={travail}>Annuler</button>
        </div>
        {!valide && quad && <p className="plai-error mb-3" role="alert">Les coins se croisent : les replacer pour former un quadrilatère.</p>}
        {erreur && <p className="plai-error mb-3" role="alert">{erreur}</p>}
        <div ref={zone} className="relative mx-auto select-none" style={{ width: dim ? dim.l * s : undefined, height: dim ? dim.h * s : undefined, touchAction: 'none' }}>
          {url && (
            <img
              src={url}
              alt={`Photo de la page ${numeroPage}`}
              draggable={false}
              style={{ width: dim ? dim.l * s : undefined, height: dim ? dim.h * s : undefined, display: 'block' }}
              onLoad={e => {
                const l = e.currentTarget.naturalWidth;
                const h = e.currentTarget.naturalHeight;
                setDim({ l, h });
                setQuad(quadComplet(l, h));
              }}
            />
          )}
          {quad && dim && (
            <>
              <svg className="pointer-events-none absolute inset-0" width={dim.l * s} height={dim.h * s} aria-hidden>
                <polygon points={points} fill="rgba(29,78,216,0.12)" stroke="#1d4ed8" strokeWidth={3} />
              </svg>
              {quad.map((p, i) => (
                <div
                  key={i}
                  role="button"
                  tabIndex={0}
                  aria-label={`Coin ${i + 1} : déplacer avec le doigt ou les flèches du clavier`}
                  onPointerDown={e => saisir(i, e)}
                  onKeyDown={e => clavier(i, e)}
                  style={{
                    position: 'absolute', left: p.x * s - POIGNEE_PX / 2, top: p.y * s - POIGNEE_PX / 2, width: POIGNEE_PX, height: POIGNEE_PX,
                    borderRadius: '50%', background: '#1d4ed8', color: '#fff', border: '3px solid #fff', boxShadow: '0 0 0 2px #1e3a8a',
                    fontSize: 20, fontWeight: 700, lineHeight: `${POIGNEE_PX - 6}px`, textAlign: 'center', cursor: 'move', touchAction: 'none', userSelect: 'none',
                  }}
                >
                  {i + 1}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

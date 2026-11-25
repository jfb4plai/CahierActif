import { useState } from 'react';
import type { PDFDocumentProxy } from '../pdf/pdfjs';
import type { CahierDoc, ImageSource, TaillePage } from '../model/types';
import { PdfCanvas } from './PdfCanvas';
import { RedresserPhoto } from './RedresserPhoto';

type Props = {
  doc: CahierDoc;
  pdf: PDFDocumentProxy | null;
  /** Une URL par photo de la source (documents de photos). */
  photoUrls: string[];
  onDeplacer: (i: number, delta: -1 | 1) => void;
  /** Positions (ordre affiché) des pages à copier dans un nouveau document. */
  onExtraire: (indices: number[]) => Promise<void>;
  /** Photo recadrée ou redressée pour la page `i` (documents de photos). */
  onRedresser: (i: number, image: ImageSource, taille: TaillePage) => void;
  onFermer: () => void;
};

const COTE_MINIATURE_PX = 150; // grand côté de la miniature

export function GestionPages({ doc, pdf, photoUrls, onDeplacer, onExtraire, onRedresser, onFermer }: Props) {
  const [choisies, setChoisies] = useState<Set<number>>(new Set());
  const [enCours, setEnCours] = useState(false);
  const [redresse, setRedresse] = useState<number | null>(null);

  const ouvrirRedressement = (i: number) => {
    const n = doc.pages[i].objets.length;
    if (n > 0 && !window.confirm(`La page ${i + 1} a ${n} annotation${n > 1 ? 's' : ''}. Recadrer ou redresser la photo les supprimera. Continuer ?`)) return;
    setRedresse(i);
  };

  const basculer = (i: number) =>
    setChoisies(s => {
      const n = new Set(s);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });

  // La page change de place : son choix la suit.
  const deplacer = (i: number, delta: -1 | 1) => {
    const j = i + delta;
    if (j < 0 || j >= doc.pages.length) return;
    setChoisies(s => {
      const n = new Set(s);
      const a = s.has(i);
      const b = s.has(j);
      if (a) n.add(j); else n.delete(j);
      if (b) n.add(i); else n.delete(i);
      return n;
    });
    onDeplacer(i, delta);
  };

  const extraire = async () => {
    setEnCours(true);
    try {
      await onExtraire([...choisies].sort((a, b) => a - b));
    } finally {
      setEnCours(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="titre-pages" className="fixed inset-0 z-[70] overflow-auto bg-[var(--bg)] p-4">
      <div className="mx-auto max-w-5xl">
        <h2 id="titre-pages" className="mb-2 font-serif text-2xl">Pages du document</h2>
        <p className="mb-3 text-base text-[var(--text2)]">
          Changer l’ordre avec « Monter » et « Descendre ». Pour garder certaines pages à part, les choisir puis les extraire :
          elles sont copiées dans un nouveau document, et ce document-ci n’est pas modifié.
        </p>
        <div className="sticky top-0 z-10 mb-3 flex flex-wrap items-center gap-2 bg-[var(--bg)] py-2">
          <button type="button" className="plai-btn min-h-[44px]" onClick={extraire} disabled={choisies.size === 0 || enCours}>
            {enCours ? 'Extraction…' : `Extraire les pages choisies (${choisies.size})`}
          </button>
          <button type="button" className="plai-btn min-h-[44px]" onClick={onFermer}>Terminé</button>
        </div>
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-3">
          {doc.pages.map((p, i) => {
            const origine = p.origine ?? i;
            const px = COTE_MINIATURE_PX / Math.max(p.largeurMm, p.hauteurMm); // px par mm
            const nb = p.objets.length;
            return (
              <li key={`${origine}-${i}`} className="plai-card flex flex-col items-center gap-2 p-2">
                <div className="relative bg-white shadow" style={{ width: p.largeurMm * px, height: p.hauteurMm * px }} aria-hidden>
                  {pdf && doc.source.type === 'pdf' && <PdfCanvas pdf={pdf} pageIndex={origine} pxMm={px} />}
                  {doc.source.type === 'photos' && photoUrls[origine] && (
                    <img src={photoUrls[origine]} alt="" draggable={false} style={{ width: '100%', height: '100%' }} />
                  )}
                </div>
                <p className="text-base font-semibold">Page {i + 1}</p>
                <p className="text-base text-[var(--text2)]">{nb === 0 ? 'Aucune annotation' : nb === 1 ? '1 annotation' : `${nb} annotations`}</p>
                <label className="flex min-h-[44px] items-center gap-2 text-base">
                  <input type="checkbox" className="h-6 w-6" checked={choisies.has(i)} onChange={() => basculer(i)} />
                  Choisir la page {i + 1}
                </label>
                {doc.source.type === 'photos' && (
                  <button type="button" className="plai-btn min-h-[44px] !text-base" onClick={() => ouvrirRedressement(i)}>Recadrer ou redresser</button>
                )}
                <div className="flex gap-2">
                  <button type="button" className="plai-btn min-h-[44px] !text-base" disabled={i === 0} aria-label={`Monter la page ${i + 1}`} onClick={() => deplacer(i, -1)}>↑ Monter</button>
                  <button type="button" className="plai-btn min-h-[44px] !text-base" disabled={i === doc.pages.length - 1} aria-label={`Descendre la page ${i + 1}`} onClick={() => deplacer(i, 1)}>↓ Descendre</button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      {redresse !== null && doc.source.type === 'photos' && (
        <RedresserPhoto
          image={doc.source.images[doc.pages[redresse].origine ?? redresse]}
          numeroPage={redresse + 1}
          onAnnuler={() => setRedresse(null)}
          onAppliquer={(image, taille) => { onRedresser(redresse, image, taille); setRedresse(null); }}
        />
      )}
    </div>
  );
}

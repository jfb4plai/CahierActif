import { useEffect, useRef } from 'react';
import type { PDFDocumentProxy } from '../pdf/pdfjs';
import { MM_PAR_PT, ratioPixelsMax } from '../lib/units';

type Props = { pdf: PDFDocumentProxy; pageIndex: number; pxMm: number };

export function PdfCanvas({ pdf, pageIndex, pxMm }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let annule = false;
    let tache: { cancel(): void; promise: Promise<void> } | null = null;
    (async () => {
      const page = await pdf.getPage(pageIndex + 1);
      if (annule || !ref.current) return;
      const vp = page.getViewport({ scale: pxMm * MM_PAR_PT }); // px par pt
      const dpr = ratioPixelsMax(vp.width, vp.height, window.devicePixelRatio || 1);
      const c = ref.current;
      c.width = Math.floor(vp.width * dpr);
      c.height = Math.floor(vp.height * dpr);
      c.style.width = `${vp.width}px`;
      c.style.height = `${vp.height}px`;
      tache = page.render({
        canvasContext: c.getContext('2d')!,
        viewport: vp,
        transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
      });
      await tache.promise.catch(() => undefined); // annulation au changement de zoom
    })();
    return () => {
      annule = true;
      tache?.cancel();
    };
  }, [pdf, pageIndex, pxMm]);

  return <canvas ref={ref} className="absolute inset-0" aria-hidden />;
}

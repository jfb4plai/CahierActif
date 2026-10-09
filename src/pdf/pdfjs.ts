import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export type { PDFDocumentProxy } from 'pdfjs-dist';

export function ouvrirPdf(data: ArrayBuffer) {
  // Copie : pdf.js transfère (détache) le tampon vers son worker.
  return pdfjs.getDocument({ data: new Uint8Array(data.slice(0)) }).promise;
}

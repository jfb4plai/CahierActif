import { useMemo, useRef, useState } from 'react';
import { Circle, Layer, Line, Stage, Text } from 'react-konva';
import type Konva from 'konva';
import { decider, type EtatStylet } from '../input/pointerPolicy';
import { ptVersMm } from '../lib/units';
import { motifFond } from '../model/fonds';
import { effacerPartiel, objetTouche } from '../model/gomme';
import { ajouterObjet, modifierObjet, remplacerObjet, supprimerObjet } from '../model/ops';
import type { OutilId } from '../model/outils';
import { nouvelId } from '../model/types';
import type { CahierDoc, ModeEntree, Objet, Point, Texte } from '../model/types';
import type { PDFDocumentProxy } from '../pdf/pdfjs';
import { EditeurTexte } from './EditeurTexte';
import { PdfCanvas } from './PdfCanvas';

type Props = {
  doc: CahierDoc;
  pageIndex: number;
  pxMm: number;
  outil: OutilId;
  couleur: string;
  epaisseur: number;
  mode: ModeEntree;
  etatStylet: EtatStylet;
  setEtatStylet: (e: EtatStylet) => void;
  pdf: PDFDocumentProxy | null;
  onCommit: (doc: CahierDoc) => void;
  onActive: () => void;
};

const RAYON_GOMME = 3; // mm
const RAYON_GOMME_FINE = 2;

export function PageVue(p: Props) {
  const page = p.doc.pages[p.pageIndex];
  const [enCours, setEnCours] = useState<Point[] | null>(null);
  const [brouillon, setBrouillon] = useState<CahierDoc | null>(null); // gommage en cours (un seul « annuler »)
  const [edition, setEdition] = useState<{ texte: Texte; nouveau: boolean } | null>(null);
  const actif = useRef(false);

  const docAffiche = brouillon ?? p.doc;
  const objets = docAffiche.pages[p.pageIndex].objets;
  const fond = useMemo(() => motifFond(page.fond, page.largeurMm, page.hauteurMm), [page.fond, page.largeurMm, page.hauteurMm]);

  const posMm = (e: Konva.KonvaEventObject<PointerEvent>): Point => {
    const q = e.target.getStage()!.getRelativePointerPosition()!;
    return { x: q.x, y: q.y, p: e.evt.pressure || undefined };
  };

  const gommer = (d: CahierDoc, q: Point): CahierDoc => {
    const objs = d.pages[p.pageIndex].objets;
    if (p.outil === 'gomme-objet') {
      const cible = [...objs].reverse().find(o => objetTouche(o, q, RAYON_GOMME));
      return cible ? supprimerObjet(d, p.pageIndex, cible.id) : d;
    }
    let out = d;
    for (const o of objs) {
      if (o.type === 'trait' && objetTouche(o, q, RAYON_GOMME_FINE)) {
        out = remplacerObjet(out, p.pageIndex, o.id, effacerPartiel(o, q, RAYON_GOMME_FINE, nouvelId));
      }
    }
    return out;
  };

  const down = (e: Konva.KonvaEventObject<PointerEvent>) => {
    p.onActive();
    if (p.outil === 'main' || p.outil === 'deplacer' || edition) return;
    const { tracer, etat } = decider(p.mode, p.etatStylet, e.evt.pointerType);
    if (etat !== p.etatStylet) p.setEtatStylet(etat);
    if (!tracer) return;
    const q = posMm(e);
    if (p.outil === 'stylo') {
      actif.current = true;
      setEnCours([q]);
    } else if (p.outil === 'gomme-objet' || p.outil === 'gomme-partielle') {
      actif.current = true;
      setBrouillon(gommer(p.doc, q));
    } else if (p.outil === 'texte') {
      const existant = [...objets].reverse().find(o => o.type === 'texte' && objetTouche(o, q, 0)) as Texte | undefined;
      setEdition(
        existant
          ? { texte: existant, nouveau: false }
          : { texte: { id: nouvelId(), type: 'texte', x: q.x, y: q.y, largeur: Math.min(80, page.largeurMm - q.x - 2), texte: '', taillePt: 14, couleur: p.couleur }, nouveau: true },
      );
    }
  };

  const move = (e: Konva.KonvaEventObject<PointerEvent>) => {
    if (!actif.current) return;
    const q = posMm(e);
    if (p.outil === 'stylo') {
      setEnCours(pts => {
        if (!pts) return pts;
        const der = pts[pts.length - 1];
        return Math.hypot(q.x - der.x, q.y - der.y) < 0.3 ? pts : [...pts, q]; // filtre le bruit < 0,3 mm
      });
    } else if (brouillon) {
      setBrouillon(gommer(brouillon, q));
    }
  };

  const up = () => {
    if (!actif.current) return;
    actif.current = false;
    if (p.outil === 'stylo' && enCours) {
      p.onCommit(ajouterObjet(p.doc, p.pageIndex, { id: nouvelId(), type: 'trait', points: enCours, couleur: p.couleur, epaisseur: p.epaisseur }));
      setEnCours(null);
    } else if (brouillon) {
      if (brouillon !== p.doc) p.onCommit(brouillon);
      setBrouillon(null);
    }
  };

  const finTexte = (valeur: string) => {
    if (!edition) return;
    const { texte, nouveau } = edition;
    setEdition(null);
    if (!valeur.trim()) {
      if (!nouveau) p.onCommit(supprimerObjet(p.doc, p.pageIndex, texte.id));
      return;
    }
    p.onCommit(nouveau ? ajouterObjet(p.doc, p.pageIndex, { ...texte, texte: valeur }) : modifierObjet(p.doc, p.pageIndex, texte.id, { texte: valeur }));
  };

  // Line : node.x/y = décalage depuis (0,0). Circle et Text : node.x/y = nouvelle position absolue.
  const finDeplacement = (o: Objet, node: Konva.Node) => {
    if (o.type === 'trait' && o.points.length === 1) {
      p.onCommit(modifierObjet(p.doc, p.pageIndex, o.id, { points: [{ ...o.points[0], x: node.x(), y: node.y() }] }));
      return;
    }
    if (o.type === 'trait') {
      const dx = node.x();
      const dy = node.y();
      node.position({ x: 0, y: 0 });
      p.onCommit(modifierObjet(p.doc, p.pageIndex, o.id, { points: o.points.map(q => ({ ...q, x: q.x + dx, y: q.y + dy })) }));
      return;
    }
    p.onCommit(modifierObjet(p.doc, p.pageIndex, o.id, { x: node.x(), y: node.y() }));
  };

  const w = page.largeurMm * p.pxMm;
  const h = page.hauteurMm * p.pxMm;
  const naviguer = p.outil === 'main' || (p.mode === 'stylet' && p.etatStylet.styletVu);
  const deplacable = p.outil === 'deplacer';

  return (
    <div
      className="relative mx-auto my-4 bg-white shadow"
      style={{ width: w, height: h, touchAction: naviguer ? 'pan-x pan-y' : 'none' }}
      aria-label={`Page ${p.pageIndex + 1}`}
    >
      {p.pdf && <PdfCanvas pdf={p.pdf} pageIndex={p.pageIndex} pxMm={p.pxMm} />}
      <Stage
        width={w}
        height={h}
        scaleX={p.pxMm}
        scaleY={p.pxMm}
        style={{ position: 'absolute', inset: 0 }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerLeave={up}
      >
        <Layer listening={false}>
          {fond.lignes.map((l, i) => (
            <Line key={`l${i}`} points={[l.x1, l.y1, l.x2, l.y2]} stroke={l.couleur} strokeWidth={l.epaisseur} />
          ))}
          {fond.ronds.map((r, i) => (
            <Circle key={`r${i}`} x={r.x} y={r.y} radius={r.r} fill={r.couleur} />
          ))}
        </Layer>
        <Layer>
          {objets.map(o =>
            o.type === 'trait' ? (
              o.points.length === 1 ? (
                <Circle key={o.id} x={o.points[0].x} y={o.points[0].y} radius={o.epaisseur / 2} fill={o.couleur}
                  draggable={deplacable} onDragEnd={e => finDeplacement(o, e.target)} />
              ) : (
                <Line key={o.id} points={o.points.flatMap(q => [q.x, q.y])} stroke={o.couleur} strokeWidth={o.epaisseur}
                  lineCap="round" lineJoin="round" hitStrokeWidth={4}
                  draggable={deplacable} onDragEnd={e => finDeplacement(o, e.target)} />
              )
            ) : edition?.texte.id === o.id ? null : (
              <Text key={o.id} x={o.x} y={o.y} width={o.largeur} text={o.texte} fontFamily="Arial"
                fontSize={ptVersMm(o.taillePt)} lineHeight={1.5} fill={o.couleur}
                draggable={deplacable} onDragEnd={e => finDeplacement(o, e.target)} />
            ),
          )}
          {enCours && (
            <Line points={enCours.flatMap(q => [q.x, q.y])} stroke={p.couleur} strokeWidth={p.epaisseur} lineCap="round" lineJoin="round" />
          )}
        </Layer>
      </Stage>
      {edition && <EditeurTexte texte={edition.texte} pxMm={p.pxMm} onFin={finTexte} />}
    </div>
  );
}

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Circle, Layer, Line, Stage, Text } from 'react-konva';
import type Konva from 'konva';
import { decider, type EtatStylet } from '../input/pointerPolicy';
import { ptVersMm, ratioPixelsMax } from '../lib/units';
import { motifFond, type Motif } from '../model/fonds';
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

type Edition = { texte: Texte; nouveau: boolean };
// Outil Texte posé sur un texte existant : glisser = déplacer, toucher sans bouger = modifier.
type TexteSaisi = { texte: Texte; depart: Point; bouge: boolean };

const RAYON_GOMME = 3; // mm
const RAYON_GOMME_FINE = 2;
const SEUIL_GLISSER = 1.5; // mm : en dessous, c'est un toucher
const TAILLE_TEXTE_PT = 14;

const CoucheFond = memo(function CoucheFond({ motif }: { motif: Motif }) {
  return (
    <Layer listening={false}>
      {motif.lignes.map((l, i) => (
        <Line key={`l${i}`} points={[l.x1, l.y1, l.x2, l.y2]} stroke={l.couleur} strokeWidth={l.epaisseur} />
      ))}
      {motif.ronds.map((r, i) => (
        <Circle key={`r${i}`} x={r.x} y={r.y} radius={r.r} fill={r.couleur} />
      ))}
    </Layer>
  );
});

type PropsObjets = {
  objets: Objet[];
  deplacable: boolean;
  idMasque: string | null;
  onDeplace: (o: Objet, node: Konva.Node) => void;
};

const CoucheObjets = memo(function CoucheObjets({ objets, deplacable, idMasque, onDeplace }: PropsObjets) {
  return (
    <Layer>
      {objets.map(o =>
        o.type === 'trait' ? (
          o.points.length === 1 ? (
            <Circle key={o.id} x={o.points[0].x} y={o.points[0].y} radius={o.epaisseur / 2} fill={o.couleur}
              draggable={deplacable} onDragEnd={e => onDeplace(o, e.target)} />
          ) : (
            <Line key={o.id} points={o.points.flatMap(q => [q.x, q.y])} stroke={o.couleur} strokeWidth={o.epaisseur}
              lineCap="round" lineJoin="round" hitStrokeWidth={4}
              draggable={deplacable} onDragEnd={e => onDeplace(o, e.target)} />
          )
        ) : idMasque === o.id ? null : (
          <Text key={o.id} x={o.x} y={o.y} width={o.largeur} text={o.texte} fontFamily="Arial"
            fontSize={ptVersMm(o.taillePt)} lineHeight={1.5} fill={o.couleur}
            draggable={deplacable} onDragEnd={e => onDeplace(o, e.target)} />
        ),
      )}
    </Layer>
  );
});

export function PageVue(p: Props) {
  const page = p.doc.pages[p.pageIndex];
  // Les refs portent la vérité du geste (plusieurs pointermove peuvent arriver entre deux rendus) ; l'état ne sert qu'à redessiner.
  const traitRef = useRef<Point[] | null>(null);
  const brouillonRef = useRef<CahierDoc | null>(null); // gommage en cours (un seul « annuler »)
  const [enCours, setEnCours] = useState<Point[] | null>(null);
  const [brouillon, setBrouillon] = useState<CahierDoc | null>(null);
  const [edition, setEdition] = useState<Edition | null>(null);
  // editionRef garantit une seule validation (blur, toucher suivant et démontage peuvent se suivre).
  const editionRef = useRef<Edition | null>(null);
  const valeurTexte = useRef('');
  const pointeurActif = useRef<number | null>(null);
  const texteSaisiRef = useRef<TexteSaisi | null>(null);
  const racine = useRef<HTMLDivElement>(null);
  const scene = useRef<Konva.Stage>(null);
  // Les deux premières pages sont montées d'emblée (pas de page blanche au premier affichage).
  const [visible, setVisible] = useState(typeof IntersectionObserver === 'undefined' || p.pageIndex < 2);
  const derniersProps = useRef(p);
  derniersProps.current = p;

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

  // touch-action: none bloque le défilement natif : le doigt rejeté (paume, doigt après stylet) fait défiler à la main.
  const defiler = (ev: PointerEvent) => {
    const id = ev.pointerId;
    let x = ev.clientX;
    let y = ev.clientY;
    const boite = racine.current?.parentElement; // défilement horizontal ; le vertical est celui de la fenêtre
    const bouger = (m: PointerEvent) => {
      if (m.pointerId !== id) return;
      const dx = m.clientX - x;
      const dy = m.clientY - y;
      x = m.clientX;
      y = m.clientY;
      if (boite) boite.scrollLeft -= dx;
      window.scrollBy({ left: 0, top: -dy, behavior: 'instant' });
    };
    const fin = (m: PointerEvent) => {
      if (m.pointerId !== id) return;
      window.removeEventListener('pointermove', bouger);
      window.removeEventListener('pointerup', fin);
      window.removeEventListener('pointercancel', fin);
    };
    window.addEventListener('pointermove', bouger);
    window.addEventListener('pointerup', fin);
    window.addEventListener('pointercancel', fin);
  };

  const down = (e: Konva.KonvaEventObject<PointerEvent>) => {
    p.onActive();
    if (editionRef.current) {
      finTexte(valeurTexte.current);
      return;
    }
    if (p.outil === 'main' || pointeurActif.current !== null) return;
    const { tracer, etat } = decider(p.mode, p.etatStylet, e.evt.pointerType);
    if (etat !== p.etatStylet) p.setEtatStylet(etat);
    if (!tracer) {
      defiler(e.evt);
      return;
    }
    if (p.outil === 'deplacer') return;
    const q = posMm(e);
    if (p.outil === 'stylo') {
      pointeurActif.current = e.evt.pointerId;
      traitRef.current = [q];
      setEnCours(traitRef.current);
    } else if (p.outil === 'gomme-objet' || p.outil === 'gomme-partielle') {
      pointeurActif.current = e.evt.pointerId;
      brouillonRef.current = gommer(p.doc, q);
      setBrouillon(brouillonRef.current);
    } else if (p.outil === 'texte') {
      const existant = [...objets].reverse().find(o => o.type === 'texte' && objetTouche(o, q, 1)) as Texte | undefined;
      if (existant) {
        pointeurActif.current = e.evt.pointerId;
        texteSaisiRef.current = { texte: existant, depart: q, bouge: false };
      } else {
        const largeur = Math.max(20, Math.min(80, page.largeurMm - q.x - 2));
        const x = q.x + largeur > page.largeurMm - 2 ? Math.max(0, page.largeurMm - 2 - largeur) : q.x;
        // Le point touché est le bas de la première ligne : le texte s'écrit juste au-dessus des pointillés.
        const y = Math.max(0, q.y - ptVersMm(TAILLE_TEXTE_PT) * 1.5);
        ouvrirEdition({ texte: { id: nouvelId(), type: 'texte', x, y, largeur, texte: '', taillePt: TAILLE_TEXTE_PT, couleur: p.couleur }, nouveau: true });
      }
    }
  };

  const move = (e: Konva.KonvaEventObject<PointerEvent>) => {
    if (pointeurActif.current === null || e.evt.pointerId !== pointeurActif.current) return;
    const q = posMm(e);
    const saisi = texteSaisiRef.current;
    if (saisi) {
      const dx = q.x - saisi.depart.x;
      const dy = q.y - saisi.depart.y;
      if (!saisi.bouge && Math.hypot(dx, dy) < SEUIL_GLISSER) return;
      saisi.bouge = true;
      brouillonRef.current = modifierObjet(p.doc, p.pageIndex, saisi.texte.id, { x: saisi.texte.x + dx, y: saisi.texte.y + dy });
      setBrouillon(brouillonRef.current);
    } else if (traitRef.current) {
      const pts = traitRef.current;
      const der = pts[pts.length - 1];
      if (Math.hypot(q.x - der.x, q.y - der.y) < 0.3) return; // filtre le bruit < 0,3 mm
      traitRef.current = [...pts, q];
      setEnCours(traitRef.current);
    } else if (brouillonRef.current) {
      brouillonRef.current = gommer(brouillonRef.current, q);
      setBrouillon(brouillonRef.current);
    }
  };

  // Fin normale ou annulée (pointercancel) : le trait commencé est conservé.
  const terminer = (pointerId: number) => {
    if (pointeurActif.current === null || pointerId !== pointeurActif.current) return;
    pointeurActif.current = null;
    const saisi = texteSaisiRef.current;
    texteSaisiRef.current = null;
    if (saisi && !saisi.bouge) {
      ouvrirEdition({ texte: saisi.texte, nouveau: false });
      return;
    }
    const trait = traitRef.current;
    const gomme = brouillonRef.current;
    traitRef.current = null;
    brouillonRef.current = null;
    setEnCours(null);
    setBrouillon(null);
    if (trait && trait.length > 0) {
      p.onCommit(ajouterObjet(p.doc, p.pageIndex, { id: nouvelId(), type: 'trait', points: trait, couleur: p.couleur, epaisseur: p.epaisseur }));
    } else if (gomme && gomme !== p.doc) {
      p.onCommit(gomme);
    }
  };
  const up = (e: Konva.KonvaEventObject<PointerEvent>) => terminer(e.evt.pointerId);

  const ouvrirEdition = (e: Edition) => {
    editionRef.current = e;
    valeurTexte.current = e.texte.texte;
    setEdition(e);
  };

  // Peut être appelée après le démontage de la zone : lit les derniers props.
  const finTexte = (valeur: string) => {
    const ed = editionRef.current;
    if (!ed) return;
    editionRef.current = null;
    setEdition(null);
    const { doc, pageIndex, onCommit } = derniersProps.current;
    const { texte, nouveau } = ed;
    if (!valeur.trim()) {
      if (!nouveau) onCommit(supprimerObjet(doc, pageIndex, texte.id));
      return;
    }
    onCommit(nouveau ? ajouterObjet(doc, pageIndex, { ...texte, texte: valeur }) : modifierObjet(doc, pageIndex, texte.id, { texte: valeur }));
  };

  // Line : node.x/y = décalage depuis (0,0). Circle et Text : node.x/y = nouvelle position absolue.
  const finDeplacement = useCallback((o: Objet, node: Konva.Node) => {
    const { doc, pageIndex, onCommit } = derniersProps.current;
    if (o.type === 'trait' && o.points.length === 1) {
      onCommit(modifierObjet(doc, pageIndex, o.id, { points: [{ ...o.points[0], x: node.x(), y: node.y() }] }));
      return;
    }
    if (o.type === 'trait') {
      const dx = node.x();
      const dy = node.y();
      node.position({ x: 0, y: 0 });
      onCommit(modifierObjet(doc, pageIndex, o.id, { points: o.points.map(q => ({ ...q, x: q.x + dx, y: q.y + dy })) }));
      return;
    }
    onCommit(modifierObjet(doc, pageIndex, o.id, { x: node.x(), y: node.y() }));
  }, []);

  const w = page.largeurMm * p.pxMm;
  const h = page.hauteurMm * p.pxMm;
  const ratio = ratioPixelsMax(w, h, window.devicePixelRatio || 1);

  // Mémoire iPad : seules les pages proches de l'écran (± une hauteur d'écran) ont leurs canvas.
  useEffect(() => {
    const el = racine.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: '100% 0px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!visible && pointeurActif.current !== null) terminer(pointeurActif.current);
  }, [visible]);

  // Stage n'a pas de prop pixelRatio : on l'impose au canvas de chaque couche.
  useEffect(() => {
    if (!visible || !scene.current) return;
    for (const l of scene.current.getLayers()) {
      l.getCanvas().setPixelRatio(ratio);
      l.batchDraw();
    }
  }, [visible, ratio]);

  const deplacable = p.outil === 'deplacer';

  return (
    <div
      ref={racine}
      className="relative mx-auto my-4 bg-white shadow"
      style={{ width: w, height: h, touchAction: p.outil === 'main' ? 'pan-x pan-y' : 'none' }}
      aria-label={`Page ${p.pageIndex + 1}`}
      onPointerCancel={e => terminer(e.pointerId)}
    >
      {visible && p.pdf && <PdfCanvas pdf={p.pdf} pageIndex={p.pageIndex} pxMm={p.pxMm} />}
      {visible && (
        <Stage
          ref={scene}
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
          <CoucheFond motif={fond} />
          <CoucheObjets objets={objets} deplacable={deplacable} idMasque={edition?.texte.id ?? null} onDeplace={finDeplacement} />
          <Layer listening={false}>
            {enCours && (
              <Line points={enCours.flatMap(q => [q.x, q.y])} stroke={p.couleur} strokeWidth={p.epaisseur} lineCap="round" lineJoin="round" />
            )}
          </Layer>
        </Stage>
      )}
      {edition && <EditeurTexte texte={edition.texte} pxMm={p.pxMm} onChange={v => { valeurTexte.current = v; }} onFin={finTexte} />}
    </div>
  );
}

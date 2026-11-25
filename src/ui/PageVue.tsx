import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Circle, Layer, Line, Rect, Stage, Text, Transformer } from 'react-konva';
import type Konva from 'konva';
import { decider, type EtatStylet } from '../input/pointerPolicy';
import { SURLIGNEUR_OPACITE } from '../lib/couleurs';
import { ptVersMm, ratioPixelsMax } from '../lib/units';
import { motifFond, type Motif } from '../model/fonds';
import { creerDroite } from '../model/droites';
import { formeContient, formeDepuisGlisse } from '../model/formes';
import { effacerPartiel, objetTouche } from '../model/gomme';
import { ajouterObjet, deplacerObjet, modifierObjet, remplacerObjet, supprimerObjet } from '../model/ops';
import { boiteDe, objetSous } from '../model/selection';
import type { ObjetBoite } from '../model/boites';
import { OUTIL_TYPE, type OutilId } from '../model/outils';
import { nouvelId } from '../model/types';
import type { CahierDoc, Droite, Forme, ModeEntree, Niveau, Objet, ObjetMaths, Point, Texte, TypeForme } from '../model/types';
import { creerFraction } from '../maths/fraction';
import { creerOperation, type ParamsOperation } from '../maths/operation';
import { ajouterPoint, creerRepere, type ParamsRepere } from '../maths/repere';
import { estVide } from '../maths/vide';
import type { PDFDocumentProxy } from '../pdf/pdfjs';
import { EditeurTexte } from './EditeurTexte';
import { DialogueOperation } from './maths/DialogueOperation';
import { DialogueRepere } from './maths/DialogueRepere';
import { EditionMaths } from './maths/EditionMaths';
import { FormeMaths } from './maths/Formes';
import { DroiteVue } from './DroiteVue';
import { FormeVue } from './FormeVue';
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
  niveau: Niveau;
  formeChoisie: TypeForme;
  /** Objet sélectionné sur cette page (outils Sélectionner et Formes) : cadre, ou poignées pour une forme. */
  selectionId: string | null;
  /** Change à chaque clic sur « Modifier » : ouvre l'édition de l'objet sélectionné (texte, maths). */
  ordreModifier: number;
  onSelection: (id: string | null) => void;
  onCommit: (maj: CahierDoc | ((d: CahierDoc) => CahierDoc)) => void;
  onActive: () => void;
  inscrireValidation: (page: number, valider: () => void) => () => void;
};

type Edition = { texte: Texte; nouveau: boolean };
// Outil de création posé sur un objet de son type : glisser = déplacer, toucher sans bouger = modifier.
// `selection` : saisi avec l'outil Sélectionner (un premier toucher choisit seulement ; un second ouvre l'édition).
type ObjetSaisi = { objet: Objet; depart: Point; bouge: boolean; selection: boolean; dejaSelectionne: boolean };
// Droite en cours : premier point `a` posé ; `b` suit le doigt ; `seconde` = le premier point est posé, on attend le second.
type DroiteEnCours = { a: Point; b: Point | null; seconde: boolean };
// Forme en cours de tracé : le glissé va de `debut` à `fin`.
type TraceForme = { debut: Point; fin: Point };
type EnEditionMaths = { objet: ObjetMaths; nouveau: boolean };
type TypeCree = NonNullable<(typeof OUTIL_TYPE)[OutilId]>;

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
  idMasque: string | null;
  idEdition: string | null;
  formesEditables: boolean; // outil Formes : les formes se déplacent d'un glissé
  largeurPage: number; // mm : les droites se prolongent jusqu'aux bords
  hauteurPage: number;
  onDeplace: (o: Objet, node: Konva.Node) => void;
  onTransforme: (o: Forme, node: Konva.Node) => void;
};

const CoucheObjets = memo(function CoucheObjets({ objets, idMasque, idEdition, formesEditables, largeurPage, hauteurPage, onDeplace, onTransforme }: PropsObjets) {
  return (
    <Layer>
      {objets.map(o =>
        o.type === 'trait' ? (
          o.points.length === 1 ? (
            <Circle key={o.id} x={o.points[0].x} y={o.points[0].y} radius={o.epaisseur / 2} fill={o.couleur}
              opacity={o.surligneur ? SURLIGNEUR_OPACITE : 1} />
          ) : (
            <Line key={o.id} points={o.points.flatMap(q => [q.x, q.y])} stroke={o.couleur} strokeWidth={o.epaisseur}
              lineCap={o.surligneur ? 'butt' : 'round'} lineJoin="round" hitStrokeWidth={4}
              opacity={o.surligneur ? SURLIGNEUR_OPACITE : 1} />
          )
        ) : o.type === 'droite' ? (
          <DroiteVue key={o.id} o={o} largeur={largeurPage} hauteur={hauteurPage} />
        ) : o.type === 'forme' ? (
          <FormeVue key={o.id} o={o} draggable={formesEditables} onDragEnd={node => onDeplace(o, node)}
            onTransformEnd={node => onTransforme(o, node)} />
        ) : o.type === 'texte' ? (
          idMasque === o.id ? null : (
            <Text key={o.id} x={o.x} y={o.y} width={o.largeur} text={o.texte} fontFamily="Arial"
              fontSize={ptVersMm(o.taillePt)} lineHeight={1.5} fill={o.couleur} />
          )
        ) : (
          <FormeMaths key={o.id} o={o} enEdition={idEdition === o.id} draggable={false} onDragEnd={() => undefined} />
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
  const droiteRef = useRef<DroiteEnCours | null>(null);
  const [droiteEnCours, setDroiteEnCours] = useState<DroiteEnCours | null>(null);
  const traceFormeRef = useRef<TraceForme | null>(null);
  const [traceForme, setTraceForme] = useState<TraceForme | null>(null);
  const transformeur = useRef<Konva.Transformer>(null);
  const [brouillon, setBrouillon] = useState<CahierDoc | null>(null);
  const [edition, setEdition] = useState<Edition | null>(null);
  // editionRef garantit une seule validation (blur, toucher suivant et démontage peuvent se suivre).
  const editionRef = useRef<Edition | null>(null);
  const valeurTexte = useRef('');
  const pointeurActif = useRef<number | null>(null);
  const objetSaisiRef = useRef<ObjetSaisi | null>(null);
  const [maths, setMaths] = useState<EnEditionMaths | null>(null);
  const mathsRef = useRef<EnEditionMaths | null>(null); // même rôle que editionRef
  const [dialogue, setDialogue] = useState<{ type: 'operation' | 'repere'; x: number; y: number } | null>(null);
  const racine = useRef<HTMLDivElement>(null);
  const scene = useRef<Konva.Stage>(null);
  // Les deux premières pages sont montées d'emblée (pas de page blanche au premier affichage).
  const [visible, setVisible] = useState(typeof IntersectionObserver === 'undefined' || p.pageIndex < 2);
  const derniersProps = useRef(p);
  derniersProps.current = p;

  const docAffiche = brouillon ?? p.doc;
  const objets = docAffiche.pages[p.pageIndex].objets;
  // L'objet maths en cours d'édition remplace (ou complète) celui du document : grille et points visibles pendant la saisie.
  const objetsAffiches = !maths ? objets
    : maths.nouveau ? [...objets, maths.objet]
    : objets.map(o => (o.id === maths.objet.id ? maths.objet : o));
  const apercuForme = traceForme ? formeDepuisGlisse(p.formeChoisie, traceForme.debut, traceForme.fin, p.couleur, p.epaisseur) : null;
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
    if (dialogue || pointeurActif.current !== null) return;
    // Politique stylet/doigt d'abord : un pointeur rejeté (paume, doigt après stylet) ne fait que défiler,
    // il ne ferme pas la saisie ouverte et ne place pas de point.
    const { tracer, etat } = decider(p.mode, p.etatStylet, e.evt.pointerType);
    if (etat !== p.etatStylet) p.setEtatStylet(etat);
    if (!tracer) {
      if (p.outil !== 'main') defiler(e.evt); // outil Main : le défilement natif s'en charge
      return;
    }
    p.onActive();
    if (editionRef.current) {
      finTexte(valeurTexte.current);
      return;
    }
    if (mathsRef.current) {
      const m = mathsRef.current.objet;
      if (m.type === 'repere') {
        const q = posMm(e);
        const r = ajouterPoint(m, q.x, q.y);
        if (r !== m) { majMaths(r); return; }
      }
      finMaths(m);
      return;
    }
    if (p.outil === 'main') return;
    // Une poignée de la forme sélectionnée : le Transformer de Konva s'en occupe seul.
    // Poignées (Transformer d'une forme, points d'une droite) : Konva s'en occupe seul.
    if (e.target.name() === 'poignee-droite' || ((p.outil === 'formes' || p.outil === 'selectionner') && e.target.getParent()?.className === 'Transformer')) return;
    const q = posMm(e);
    if (p.outil === 'formes') {
      const cible = [...objets].reverse().find(o => o.type === 'forme' && formeContient(o, q, 1));
      if (cible) { p.onSelection(cible.id); return; } // le glissé qui suit la déplace (Konva)
      p.onSelection(null);
      pointeurActif.current = e.evt.pointerId;
      traceFormeRef.current = { debut: q, fin: q };
      return;
    }
    if (p.outil === 'droite') {
      p.onSelection(null);
      pointeurActif.current = e.evt.pointerId;
      const dr = droiteRef.current;
      // Premier toucher : point A. Toucher suivant : point B, qui suit le doigt jusqu'au relâchement (ajustable).
      droiteRef.current = dr?.seconde ? { ...dr, b: q } : { a: q, b: null, seconde: false };
      setDroiteEnCours(droiteRef.current);
      return;
    }
    if (p.outil === 'selectionner') {
      const cible = objetSous(objets, q, 2.5);
      if (!cible) { p.onSelection(null); return; }
      p.onSelection(cible.id);
      pointeurActif.current = e.evt.pointerId;
      objetSaisiRef.current = { objet: cible, depart: q, bouge: false, selection: true, dejaSelectionne: cible.id === p.selectionId };
      return;
    }
    const typeOutil = OUTIL_TYPE[p.outil];
    if (typeOutil) {
      const existant = [...objets].reverse().find(o => o.type === typeOutil && objetTouche(o, q, 1)) as Exclude<ObjetBoite, Forme> | undefined;
      if (existant) {
        pointeurActif.current = e.evt.pointerId;
        objetSaisiRef.current = { objet: existant, depart: q, bouge: false, selection: false, dejaSelectionne: false };
      } else {
        creer(typeOutil, q);
      }
      return;
    }
    if (p.outil === 'stylo' || p.outil === 'surligneur') {
      pointeurActif.current = e.evt.pointerId;
      traitRef.current = [q];
      setEnCours(traitRef.current);
    } else if (p.outil === 'gomme-objet' || p.outil === 'gomme-partielle') {
      pointeurActif.current = e.evt.pointerId;
      brouillonRef.current = gommer(p.doc, q);
      setBrouillon(brouillonRef.current);
    }
  };

  const move = (e: Konva.KonvaEventObject<PointerEvent>) => {
    if (pointeurActif.current === null || e.evt.pointerId !== pointeurActif.current) return;
    const q = posMm(e);
    const saisi = objetSaisiRef.current;
    if (droiteRef.current) {
      const dr = droiteRef.current;
      // Glissé depuis le premier point : le second suit le doigt (même geste que les formes).
      if (dr.seconde || Math.hypot(q.x - dr.a.x, q.y - dr.a.y) >= SEUIL_GLISSER) droiteRef.current = { ...dr, b: q };
      setDroiteEnCours(droiteRef.current);
    } else if (traceFormeRef.current) {
      traceFormeRef.current = { ...traceFormeRef.current, fin: q };
      setTraceForme(traceFormeRef.current);
    } else if (saisi) {
      const dx = q.x - saisi.depart.x;
      const dy = q.y - saisi.depart.y;
      if (!saisi.bouge && Math.hypot(dx, dy) < SEUIL_GLISSER) return;
      saisi.bouge = true;
      brouillonRef.current = deplacerObjet(p.doc, p.pageIndex, saisi.objet.id, dx, dy);
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
    const dr = droiteRef.current;
    if (dr) {
      const d = dr.b ? creerDroite(dr.a, dr.b, p.couleur, p.epaisseur) : null;
      if (d) {
        droiteRef.current = null;
        setDroiteEnCours(null);
        p.onCommit(ajouterObjet(p.doc, p.pageIndex, d));
        p.onSelection(d.id); // les deux points sont tout de suite ajustables
      } else {
        // Simple toucher (ou second point trop proche du premier) : on attend le second point.
        droiteRef.current = { a: dr.a, b: null, seconde: true };
        setDroiteEnCours(droiteRef.current);
      }
      return;
    }
    const tracee = traceFormeRef.current;
    if (tracee) {
      traceFormeRef.current = null;
      setTraceForme(null);
      const f = formeDepuisGlisse(p.formeChoisie, tracee.debut, tracee.fin, p.couleur, p.epaisseur);
      if (f) {
        p.onCommit(ajouterObjet(p.doc, p.pageIndex, f));
        p.onSelection(f.id); // poignées tout de suite : ajuster la taille, tourner
      }
      return;
    }
    const saisi = objetSaisiRef.current;
    objetSaisiRef.current = null;
    if (saisi && !saisi.bouge) {
      if (saisi.selection && !saisi.dejaSelectionne) return; // premier toucher : choisir seulement
      if (saisi.objet.type === 'texte') ouvrirEdition({ texte: saisi.objet, nouveau: false });
      else if (saisi.objet.type !== 'trait' && saisi.objet.type !== 'forme' && saisi.objet.type !== 'droite') ouvrirMaths({ objet: saisi.objet, nouveau: false });
      return;
    }
    const trait = traitRef.current;
    const gomme = brouillonRef.current;
    traitRef.current = null;
    brouillonRef.current = null;
    setEnCours(null);
    setBrouillon(null);
    if (trait && trait.length > 0) {
      p.onCommit(ajouterObjet(p.doc, p.pageIndex, {
        id: nouvelId(), type: 'trait', points: trait, couleur: p.couleur, epaisseur: p.epaisseur,
        ...(p.outil === 'surligneur' ? { surligneur: true } : {}),
      }));
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
    const { pageIndex, onCommit } = derniersProps.current;
    const { texte, nouveau } = ed;
    if (!valeur.trim()) {
      if (!nouveau) onCommit(doc => supprimerObjet(doc, pageIndex, texte.id));
      return;
    }
    onCommit(doc => (nouveau ? ajouterObjet(doc, pageIndex, { ...texte, texte: valeur }) : modifierObjet(doc, pageIndex, texte.id, { texte: valeur, x: texte.x, y: texte.y })));
  };

  const ouvrirMaths = (e: EnEditionMaths) => {
    mathsRef.current = e;
    setMaths(e);
  };

  // Ignore une mise à jour tardive (rendu d'expression) arrivant après la fermeture ou pour un autre objet.
  const majMaths = (objet: ObjetMaths) => {
    const ed = mathsRef.current;
    if (!ed || ed.objet.id !== objet.id) return;
    mathsRef.current = { ...ed, objet };
    setMaths(mathsRef.current);
  };

  // Comme finTexte : une seule validation, lit les derniers props. Opération et repère vides sont conservés (estVide).
  const finMaths = (objet: ObjetMaths) => {
    const ed = mathsRef.current;
    if (!ed || ed.objet.id !== objet.id) return;
    mathsRef.current = null;
    setMaths(null);
    const { pageIndex, onCommit } = derniersProps.current;
    if (estVide(objet)) {
      if (!ed.nouveau) onCommit(doc => supprimerObjet(doc, pageIndex, objet.id));
      return;
    }
    onCommit(doc => (ed.nouveau ? ajouterObjet(doc, pageIndex, objet) : remplacerObjet(doc, pageIndex, objet.id, [objet])));
  };

  // Valide la saisie ouverte (texte ou maths) : appelé par l'éditeur avant export / .cahier / retour,
  // quand on touche une autre page, et au démontage. Les refs garantissent une seule validation.
  const validerEdition = () => {
    if (editionRef.current) finTexte(valeurTexte.current);
    if (mathsRef.current) finMaths(mathsRef.current.objet);
  };
  const validerRef = useRef(validerEdition);
  validerRef.current = validerEdition;
  const { inscrireValidation, pageIndex } = p;
  useEffect(() => {
    const desinscrire = inscrireValidation(pageIndex, () => validerRef.current());
    return () => {
      desinscrire();
      // StrictMode : le démontage simulé du premier rendu n'a rien d'ouvert, l'appel est sans effet.
      validerRef.current();
    };
  }, [inscrireValidation, pageIndex]);

  const creer = (type: TypeCree, q: Point) => {
    if (type === 'texte') {
      const largeur = Math.max(20, Math.min(80, page.largeurMm - q.x - 2));
      const x = q.x + largeur > page.largeurMm - 2 ? Math.max(0, page.largeurMm - 2 - largeur) : q.x;
      // Le point touché est le bas de la première ligne : le texte s'écrit juste au-dessus des pointillés.
      const y = Math.max(0, q.y - ptVersMm(TAILLE_TEXTE_PT) * 1.5);
      ouvrirEdition({ texte: { id: nouvelId(), type: 'texte', x, y, largeur, texte: '', taillePt: TAILLE_TEXTE_PT, couleur: p.couleur }, nouveau: true });
    } else if (type === 'operation' || type === 'repere') {
      setDialogue({ type, x: q.x, y: q.y });
    } else if (type === 'fraction') {
      ouvrirMaths({ objet: creerFraction(q.x, q.y, p.couleur), nouveau: true });
    } else {
      ouvrirMaths({ objet: { id: nouvelId(), type: 'expression', x: q.x, y: q.y, latex: '', taillePt: 16, couleur: p.couleur, largeurMm: 10, hauteurMm: 8 }, nouveau: true });
    }
  };

  const deplacerEdition = (dx: number, dy: number) => {
    const ed = editionRef.current;
    if (!ed) return;
    const suivant = { ...ed, texte: { ...ed.texte, x: ed.texte.x + dx, y: ed.texte.y + dy } };
    editionRef.current = suivant;
    setEdition(suivant);
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

  // Fin d'un redimensionnement ou d'une rotation : la mise à l'échelle de Konva est reportée dans la taille, puis remise à 1.
  const finTransformation = useCallback((o: Forme, node: Konva.Node) => {
    const { doc, pageIndex, onCommit } = derniersProps.current;
    const sx = Math.abs(node.scaleX());
    const sy = Math.abs(node.scaleY());
    node.scale({ x: 1, y: 1 });
    onCommit(modifierObjet(doc, pageIndex, o.id, {
      x: node.x(),
      y: node.y(),
      rotation: node.rotation(),
      largeur: o.largeur > 0 ? Math.max(1, o.largeur * sx) : 0,
      hauteur: o.hauteur > 0 ? Math.max(1, o.hauteur * sy) : 0,
    }));
  }, []);

  // Poignées d'une droite choisie : déplacer un des deux points (la droite suit pendant le glissé).
  const majPoignee = (cle: 'a' | 'b', node: Konva.Node, id: string) => {
    brouillonRef.current = modifierObjet(p.doc, p.pageIndex, id, { [cle]: { x: node.x(), y: node.y() } } as Partial<Droite>);
    setBrouillon(brouillonRef.current);
  };
  const finPoignee = (cle: 'a' | 'b', node: Konva.Node, id: string) => {
    majPoignee(cle, node, id);
    const final = brouillonRef.current;
    brouillonRef.current = null;
    setBrouillon(null);
    if (final) p.onCommit(final);
  };

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
    if (!visible && mathsRef.current) finMaths(mathsRef.current.objet);
  }, [visible]);

  // Stage n'a pas de prop pixelRatio : on l'impose au canvas de chaque couche.
  useEffect(() => {
    if (!visible || !scene.current) return;
    for (const l of scene.current.getLayers()) {
      l.getCanvas().setPixelRatio(ratio);
      l.batchDraw();
    }
  }, [visible, ratio]);

  // Un changement d'outil abandonne la droite commencée.
  useEffect(() => {
    if (p.outil !== 'droite') { droiteRef.current = null; setDroiteEnCours(null); }
  }, [p.outil]);

  // Poignées sur la forme sélectionnée (retrouvée par son id dans la scène).
  const surFormes = p.outil === 'formes';
  const surSelection = surFormes || p.outil === 'selectionner' || p.outil === 'droite';
  const selectionnee = surSelection && p.selectionId ? objetsAffiches.find(o => o.id === p.selectionId) : undefined;
  const formeSelectionnee = selectionnee?.type === 'forme' ? selectionnee : undefined;
  const droiteSelectionnee = selectionnee?.type === 'droite' ? selectionnee : undefined;
  const boiteSelection = selectionnee && selectionnee.type !== 'forme' && selectionnee.type !== 'droite' ? boiteDe(selectionnee) : undefined;
  useEffect(() => {
    const tr = transformeur.current;
    if (!tr) return;
    const noeud = visible && formeSelectionnee ? scene.current?.findOne('#' + formeSelectionnee.id) : undefined;
    tr.nodes(noeud ? [noeud] : []);
    tr.getLayer()?.batchDraw();
  }, [visible, formeSelectionnee]);

  // Bouton « Modifier » de la barre : ouvre l'édition de l'objet sélectionné sur cette page.
  const ordreVu = useRef(p.ordreModifier);
  useEffect(() => {
    if (p.ordreModifier === ordreVu.current) return;
    ordreVu.current = p.ordreModifier;
    const o = selectionnee;
    if (!o) return;
    if (o.type === 'texte') ouvrirEdition({ texte: o, nouveau: false });
    else if (o.type !== 'trait' && o.type !== 'forme' && o.type !== 'droite') ouvrirMaths({ objet: o, nouveau: false });
  }, [p.ordreModifier]);

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
          <CoucheObjets objets={objetsAffiches} idMasque={edition?.texte.id ?? null}
            idEdition={maths?.objet.id ?? null} formesEditables={surFormes} largeurPage={page.largeurMm} hauteurPage={page.hauteurMm} onDeplace={finDeplacement} onTransforme={finTransformation} />
          <Layer listening={false}>
            {enCours && (
              <Line points={enCours.flatMap(q => [q.x, q.y])} stroke={p.couleur} strokeWidth={p.epaisseur}
                lineCap={p.outil === 'surligneur' ? 'butt' : 'round'} lineJoin="round" opacity={p.outil === 'surligneur' ? SURLIGNEUR_OPACITE : 1} />
            )}
            {apercuForme && <FormeVue o={apercuForme} draggable={false} listening={false} />}
            {droiteEnCours && (
              <DroiteVue o={{ id: 'apercu', type: 'droite', a: droiteEnCours.a, b: droiteEnCours.b ?? droiteEnCours.a, couleur: p.couleur, epaisseur: p.epaisseur }}
                largeur={page.largeurMm} hauteur={page.hauteurMm} />
            )}
          </Layer>
          <Layer listening={false}>
            {boiteSelection && (
              <Rect x={boiteSelection.x - 1} y={boiteSelection.y - 1} width={boiteSelection.largeur + 2} height={boiteSelection.hauteur + 2}
                stroke="#0f6e56" strokeWidth={0.6} dash={[2, 1.5]} />
            )}
          </Layer>
          {droiteSelectionnee && (
            <Layer>
              {(['a', 'b'] as const).map(cle => (
                <Circle key={cle} name="poignee-droite" x={droiteSelectionnee[cle].x} y={droiteSelectionnee[cle].y} radius={3.5}
                  fill="#ffffff" stroke="#0f6e56" strokeWidth={0.6} draggable
                  onDragMove={e => majPoignee(cle, e.target, droiteSelectionnee.id)}
                  onDragEnd={e => finPoignee(cle, e.target, droiteSelectionnee.id)} />
              ))}
            </Layer>
          )}
          <Layer>
            <Transformer ref={transformeur} rotateEnabled flipEnabled={false} keepRatio={false}
              anchorSize={22} anchorCornerRadius={11} rotateAnchorOffset={30} borderStroke="#0f6e56" anchorStroke="#0f6e56" anchorFill="#ffffff" />
          </Layer>
        </Stage>
      )}
      {edition && <EditeurTexte texte={edition.texte} pxMm={p.pxMm} onChange={v => { valeurTexte.current = v; }} onFin={finTexte} onDeplacer={deplacerEdition} />}
      {maths && <EditionMaths o={maths.objet} pxMm={p.pxMm} onChange={majMaths} onFin={finMaths} />}
      {dialogue?.type === 'operation' && (
        <DialogueOperation
          niveau={p.niveau}
          onAnnuler={() => setDialogue(null)}
          onValider={(params: ParamsOperation) => {
            setDialogue(null);
            ouvrirMaths({ objet: creerOperation(dialogue.x, dialogue.y, params, p.couleur), nouveau: true });
          }}
        />
      )}
      {dialogue?.type === 'repere' && (
        <DialogueRepere
          onAnnuler={() => setDialogue(null)}
          onValider={(params: ParamsRepere) => {
            setDialogue(null);
            ouvrirMaths({ objet: creerRepere(dialogue.x, dialogue.y, params, p.couleur), nouveau: true });
          }}
        />
      )}
    </div>
  );
}

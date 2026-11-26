import { creerFraction } from '../maths/fraction';
import { creerOperation, ecrireCellule } from '../maths/operation';
import { arc } from '../model/instruments';
import { creerDroite } from '../model/droites';
import { formeDepuisGlisse } from '../model/formes';
import { nouvelId, A4 } from '../model/types';
import type { CahierDoc, Dossier, Objet, Page, Point, TypeForme } from '../model/types';
import type { StorageAdapter } from '../storage/adapter';

/** Cours et document d'exemple, créés une fois par appareil. Identifiants fixes : aucun doublon si deux onglets s'ouvrent ensemble. */
export const DOSSIER_EXEMPLE_ID = 'defaut-exemple';
export const DOSSIER_EXEMPLE_NOM = 'Exemple';
export const DOC_EXEMPLE_ID = 'defaut-exemple-document';
const CLE_EXEMPLE = 'cahieractif.exemple-amorce';

const NOIR = '#1a1814';
const BLEU = '#1d4ed8';
const ROUGE = '#dc2626';
const VERT = '#15803d';
const JAUNE = '#facc15';

const texte = (x: number, y: number, largeur: number, t: string, taillePt = 12, couleur = NOIR): Objet =>
  ({ id: nouvelId(), type: 'texte', x, y, largeur, texte: t, taillePt, couleur });
/** Étiquette en bleu : elle nomme la commande qui a produit l'annotation voisine. */
const etiquette = (x: number, y: number, largeur: number, t: string): Objet => texte(x, y, largeur, t, 10, BLEU);
const trait = (points: Point[], couleur = NOIR, epaisseur = 0.8, surligneur = false): Objet =>
  ({ id: nouvelId(), type: 'trait', points, couleur, epaisseur, ...(surligneur ? { surligneur: true } : {}) });
const forme = (type: TypeForme, x: number, y: number, l: number, h: number, couleur = NOIR): Objet => {
  const f = formeDepuisGlisse(type, { x, y }, { x: x + l, y: y + h }, couleur, 0.8);
  if (!f) throw new Error(`forme d'exemple trop petite : ${type}`);
  return f;
};
/** Vague : ressemble à un mot écrit à main levée. */
const vague = (x0: number, y0: number, longueur: number): Point[] =>
  Array.from({ length: 41 }, (_, k) => ({ x: x0 + (longueur * k) / 40, y: y0 + 3.5 * Math.sin((k * Math.PI) / 4) }));

function page1(): Page {
  const objets: Objet[] = [
    texte(15, 10, 180, 'Exemple CahierActif : chaque annotation est précédée de la commande utilisée (en bleu).', 14),

    etiquette(15, 32, 180, 'Commande : Texte. Toucher Texte, puis la page, puis écrire au clavier.'),
    texte(15, 38, 180, 'Bonjour ! Ce texte est écrit au clavier.', 14),

    etiquette(15, 56, 180, 'Commande : Stylo (couleur noire, épaisseur Moyen). Écrire ou dessiner à main levée.'),
    trait(vague(20, 70, 110)),
    trait(vague(20, 79, 70), ROUGE, 1.6),

    etiquette(15, 92, 180, 'Commande : Surligneur (jaune). Glisser sur le mot à surligner.'),
    texte(15, 98, 100, 'Mot important', 14),
    trait([{ x: 15.5, y: 101.8 }, { x: 52, y: 101.8 }], JAUNE, 6, true),

    etiquette(15, 116, 180, 'Commande : Formes, puis Rond, Carré, Rectangle, Triangle ou Flèche. Glisser sur la page.'),
    forme('rond', 20, 124, 16, 16),
    forme('carre', 46, 124, 16, 16, VERT),
    forme('rectangle', 72, 124, 26, 16),
    forme('triangle', 108, 124, 18, 16, ROUGE),
    forme('fleche-droite', 138, 129, 32, 6, BLEU),

    etiquette(15, 150, 180, 'Commande : Droite. Toucher deux points : la droite passe par les deux et va jusqu’aux bords.'),
    (creerDroite({ x: 30, y: 164 }, { x: 150, y: 166 }, ROUGE, 0.4) as Objet),

    etiquette(15, 178, 180, 'Commandes pour corriger : Gomme (efface un trait entier), Gomme fine (efface une partie d’un trait), Annuler (défait le dernier geste), Rétablir.'),
    etiquette(15, 192, 180, 'Commande : Sélectionner. Toucher un objet pour le choisir, le glisser pour le déplacer, Modifier pour changer son contenu, Supprimer pour l’enlever. Commande : Main. Faire défiler la page sans écrire.'),
    etiquette(15, 210, 180, 'Page suivante : maths et géométrie. Pour effacer cet exemple : Retour à mes documents, puis Supprimer.'),
  ];
  return { largeurMm: A4.largeurMm, hauteurMm: A4.hauteurMm, fond: 'aucun', objets };
}

function page2(): Page {
  // 245 + 378 = 623, avec les retenues : 5 + 8 = 13 (retenue 1 aux dizaines), 4 + 7 + 1 = 12 (retenue 1 aux centaines).
  let op = creerOperation(20, 26, { operateur: '+', colonnes: 3, lignes: 3, virgule: null, chiffresDiviseur: 1, couleurs: true }, NOIR);
  const chiffres = ['2', '4', '5', '3', '7', '8', '6', '2', '3'];
  chiffres.forEach((c, i) => { op = ecrireCellule(op, 'case', i, c); });
  op = ecrireCellule(op, 'retenue', 0, '1');
  op = ecrireCellule(op, 'retenue', 1, '1');
  const fraction = { ...creerFraction(120, 30, NOIR), numerateur: '3', denominateur: '4' };

  const ouverture = arc({ x: 60, y: 196 }, 28, -Math.PI / 2, (3 * Math.PI) / 2);
  const angle = (deg: number): Point => ({ x: 140 + 40 * Math.cos((deg * Math.PI) / 180), y: 238 - 40 * Math.sin((deg * Math.PI) / 180) });

  const objets: Objet[] = [
    etiquette(15, 12, 90, 'Commande : Opération. Toucher la page, choisir + et 3 colonnes, puis écrire avec le pavé numérique.'),
    op,
    etiquette(115, 12, 85, 'Commande : Fraction. Toucher la page, puis écrire le haut et le bas.'),
    fraction,

    etiquette(15, 72, 180, 'Commande : Plus d’options, puis Fond de la page. Cette page est en « Quadrillé 1 cm » : les opérations s’alignent sur les carreaux.'),
    etiquette(15, 90, 180, 'Instruments (colonne de gauche, section Géométrie) : Règle, Équerre, Rapporteur, Compas, Loupe. Section Lecture : Cache-ligne. Ils ne sont pas enregistrés dans le document : seuls les traits qu’ils ont aidé à tracer le sont.'),

    etiquette(15, 112, 180, 'Commande : Règle, puis Stylo commencé près du bord. Le trait reste droit et sa longueur s’affiche (ici 12,0 cm).'),
    trait([{ x: 20, y: 132 }, { x: 140, y: 132 }]),
    texte(145, 128, 50, '12,0 cm', 12, BLEU),

    etiquette(15, 150, 90, 'Commande : Compas. Régler l’écartement (ici 2,8 cm), puis glisser la mine autour de la pointe.'),
    trait(ouverture),
    trait([{ x: 58, y: 194 }, { x: 62, y: 198 }]),
    trait([{ x: 62, y: 194 }, { x: 58, y: 198 }]),

    etiquette(110, 150, 90, 'Commande : Rapporteur, puis Stylo commencé près de sa base. Angle de 40° ; l’élève lit lui-même la graduation.'),
    trait([{ x: 140, y: 238 }, { x: 180, y: 238 }]),
    trait([{ x: 140, y: 238 }, angle(40)]),
    texte(160, 226, 30, '40°', 12, BLEU),

    etiquette(15, 262, 180, 'Niveau Secondaire : commandes Expression (clavier mathématique) et Repère (axes gradués).'),
  ];
  return { largeurMm: A4.largeurMm, hauteurMm: A4.hauteurMm, fond: 'quadrille10', objets };
}

/** Document d'exemple : deux pages, chaque annotation est précédée de la commande qui l'a produite. */
export function creerDocumentExemple(maintenant = Date.now()): CahierDoc {
  return {
    id: DOC_EXEMPLE_ID,
    titre: 'Exemple : toutes les commandes',
    niveau: 'p3p6',
    cree: maintenant,
    modifie: maintenant,
    source: { type: 'vierge' },
    pages: [page1(), page2()],
  };
}

/**
 * Crée le cours « Exemple » et son document, une seule fois par appareil (même après la première installation de l'application).
 * Un cours ou un document supprimé ne revient pas ; un document d'exemple déjà présent n'est jamais réécrit.
 */
export async function amorcerExemple(stockage: StorageAdapter, mem: Pick<Storage, 'getItem' | 'setItem'> = localStorage): Promise<void> {
  if (mem.getItem(CLE_EXEMPLE)) return;
  const dossier: Dossier = { id: DOSSIER_EXEMPLE_ID, nom: DOSSIER_EXEMPLE_NOM, cree: Date.now() };
  if (!(await stockage.listerDossiers()).some(d => d.id === DOSSIER_EXEMPLE_ID)) await stockage.enregistrerDossier(dossier);
  if (!(await stockage.charger(DOC_EXEMPLE_ID))) {
    await stockage.enregistrer(creerDocumentExemple());
    await stockage.deplacer(DOC_EXEMPLE_ID, DOSSIER_EXEMPLE_ID);
  }
  mem.setItem(CLE_EXEMPLE, '1');
}

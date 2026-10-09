# CahierActif — Plan 3 : écriture mathématique Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter à CahierActif les opérations posées en colonnes, les fractions, l'éditeur d'expressions (MathLive, secondaire) et le repère cartésien (secondaire), modifiables après coup, déplaçables, gommables et exportés dans le PDF annoté.

**Architecture:** Chaque objet mathématique est un nouveau type du modèle (positions en mm page) avec un module pur `src/maths/*.ts` qui calcule sa géométrie (testé). Affichage par des formes Konva, saisie par des superpositions HTML (comme les zones de texte), création par un outil dédié filtré par niveau. Les expressions passent par MathJax 4 (LaTeX → SVG) pour l'écran et l'export (PNG ~300 dpi), MathLive pour la saisie ; les deux sont chargés à la demande.

**Tech Stack:** existant (React 18, Konva 9, pdf-lib, Vitest) + `@mathjax/src@4` (rendu SVG, fonctionne aussi sous Node) + `mathlive@0.111` (champ de saisie + clavier mathématique).

**Spec :** `docs/superpowers/specs/2026-10-09-cahieractif-design.md`, section 5.

**Point de départ :** `main` à jour (plan 1 livré et déployé, poignée de déplacement des textes incluse). Toutes les commandes partent de `C:\Users\jfbeg\OneDrive\claude-workspace\cahieractif`. Chaque message de commit se termine par une ligne vide puis `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

## Décisions de conception (à respecter)

| Sujet | Décision |
|---|---|
| Outils | `operation` (tous niveaux), `fraction` (P3-P6, secondaire), `expression` et `repere` (secondaire). |
| Opérateurs | P1-P2 : + et − ; P3-P6 et secondaire : + − × ÷. |
| Décimales | Secondaire seulement : 0 à 3 colonnes décimales, séparées par un trait vertical rouge. |
| Diviseur | P3-P6 : 1 chiffre ; secondaire : 1 à 3 chiffres. |
| Cases | 10 mm ; ligne de retenues 6 mm au-dessus (pas de retenues pour ÷). |
| Colonnes colorées | Option (cochée par défaut). Depuis la droite de la partie entière : unités bleu `#dbeafe`, dizaines vert `#dcfce7`, centaines rouge `#fee2e2`, puis on recommence ; colonnes décimales violet `#f3e8ff`. |
| Saisie des opérations | Une case = un chiffre. Après un chiffre, le curseur passe à la case de gauche (sens du calcul) ; division et retenues : à droite / sur place. Flèches pour se déplacer. Pavé numérique à l'écran (gros boutons). |
| Aucun calcul | L'app ne calcule, ne vérifie et ne corrige jamais rien. |
| Fraction | Objet autonome posé n'importe où (pas à l'intérieur d'une zone de texte : écart assumé). Police 16 pt. |
| Expression | Saisie MathLive, clavier simplifié par défaut, clavier complet en option. Virgule décimale `,`. Affichage et export via MathJax 4 (SVG, couleur de l'élève). |
| Repère | Réglage xmin, xmax, ymin, ymax (entiers, 0 compris dans chaque intervalle) et unité 5 mm / 1 cm / 2 cm. Points placés en touchant le repère, arrondis à la demi-unité, nommés A, B, C…, étiquette « A(2 ; 3,5) ». |
| Créer / modifier / déplacer | Outil d'un type : toucher un endroit vide = créer ; toucher un objet de ce type = le modifier ; glisser un objet de ce type = le déplacer (même logique que l'outil Texte). |
| Objet vide | Fraction vide ou expression vide à la fermeture = supprimée. Opération et repère vides = conservés (posés volontairement). |
| Export | Opérations, fractions, repères en vectoriel (Helvetica). Expressions en PNG ~300 dpi ; si le rendu échoue, le LaTeX brut est écrit en texte. |

## Structure des fichiers

```
src/
├── model/
│   ├── types.ts            (modifié) OperationPosee, Fraction, Expression, Repere, PointRepere
│   ├── boites.ts           (nouveau) boîte englobante de tout objet non-trait + hauteurTexte
│   ├── gomme.ts            (modifié) objetTouche utilise boites.ts
│   └── outils.ts           (modifié) 4 outils + OUTIL_TYPE
├── maths/
│   ├── operation.ts        géométrie, couleurs, navigation, écriture de cellule
│   ├── fraction.ts         géométrie, création
│   ├── repere.ts           géométrie, conversions, points
│   ├── expression.ts       LaTeX → SVG (MathJax 4), dimensions
│   ├── vide.ts             objet maths vide ?
│   ├── mathlive.ts         configuration MathLive + claviers (navigateur)
│   └── rasteriser.ts       SVG → image / PNG (navigateur)
├── pdf/
│   ├── origine.ts          (nouveau) repère CropBox partagé (extrait de export.ts)
│   ├── exportMaths.ts      dessin PDF des objets maths
│   └── export.ts           (modifié) dispatch + option rendreExpression
└── ui/
    ├── PageVue.tsx         (modifié) création / édition / déplacement génériques
    ├── Editeur.tsx         (modifié) passe niveau + rasteriseur d'export
    └── maths/
        ├── Formes.tsx          formes Konva des 4 objets
        ├── PaveNumerique.tsx
        ├── DialogueOperation.tsx
        ├── EditeurOperation.tsx
        ├── EditeurFraction.tsx
        ├── EditeurExpression.tsx
        ├── DialogueRepere.tsx
        ├── PanneauRepere.tsx
        └── EditionMaths.tsx    aiguillage vers le bon éditeur
scripts/copier-mathlive.mjs     copie les polices MathLive dans public/ (dev et build)
```

---

### Task 1: Dépendances et types du modèle

**Files:**
- Modify: `package.json`, `.gitignore`, `src/model/types.ts`
- Create: `scripts/copier-mathlive.mjs`

- [ ] **Step 1: Installer**

```bash
npm i @mathjax/src@4.1.3 mathlive@0.111.1
```

Expected: pas d'erreur `ERESOLVE`.

- [ ] **Step 2: Script de copie des polices MathLive**

`scripts/copier-mathlive.mjs` :

```js
import { cpSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// MathLive charge ses polices depuis une URL : on les sert nous-mêmes (hors ligne, aucun appel à un CDN).
const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(racine, 'node_modules', 'mathlive', 'fonts');
const cible = join(racine, 'public', 'mathlive', 'fonts');

if (!existsSync(source)) {
  console.error('node_modules/mathlive/fonts introuvable : lancer npm install');
  process.exit(1);
}
cpSync(source, cible, { recursive: true });
console.log('polices MathLive copiées dans public/mathlive/fonts');
```

Dans `package.json`, remplacer les scripts `dev` et `build` :

```json
    "dev": "node scripts/copier-mathlive.mjs && vite",
    "build": "node scripts/copier-mathlive.mjs && tsc --noEmit && vite build",
```

Ajouter à `.gitignore` :

```
public/mathlive
```

Run: `node scripts/copier-mathlive.mjs && ls public/mathlive/fonts | head -3`
Expected: `polices MathLive copiées…` puis des fichiers `KaTeX_*.woff2`.

- [ ] **Step 3: Types**

Dans `src/model/types.ts`, remplacer la ligne :

```ts
/** Étendu par les plans 2 (géométrie) et 3 (maths). */
export type Objet = Trait | Texte;
```

par :

```ts
export type Operateur = '+' | '-' | '×' | '÷';

/** Opération posée : grille de cases (lignes × colonnes, ligne par ligne), '' = case vide. */
export type OperationPosee = {
  id: string;
  type: 'operation';
  x: number; // coin haut-gauche, mm
  y: number;
  operateur: Operateur;
  colonnes: number;
  lignes: number;
  cases: string[];
  retenues: string[]; // une par colonne ; vide pour ÷
  virgule: number | null; // nombre de colonnes décimales à droite ; null = entiers
  diviseur: string[]; // ÷ seulement
  quotient: string[]; // ÷ seulement
  couleurs: boolean;
  couleur: string;
};

export type Fraction = {
  id: string;
  type: 'fraction';
  x: number;
  y: number;
  numerateur: string;
  denominateur: string;
  taillePt: number;
  couleur: string;
};

export type Expression = {
  id: string;
  type: 'expression';
  x: number;
  y: number;
  latex: string;
  taillePt: number;
  couleur: string;
  largeurMm: number; // calculées au rendu MathJax, servent au toucher et à l'export
  hauteurMm: number;
};

/** Coordonnées en unités du repère. */
export type PointRepere = { nom: string; x: number; y: number };

export type Repere = {
  id: string;
  type: 'repere';
  x: number;
  y: number;
  xmin: number;
  xmax: number;
  ymin: number;
  ymax: number;
  uniteMm: number;
  points: PointRepere[];
  couleur: string;
};

export type ObjetMaths = OperationPosee | Fraction | Expression | Repere;

/** Étendu par le plan 2 (géométrie). */
export type Objet = Trait | Texte | ObjetMaths;
```

- [ ] **Step 4: Vérifier**

Run: `npx tsc --noEmit`
Expected: erreurs possibles dans `src/model/gomme.ts`, `src/pdf/export.ts`, `src/ui/PageVue.tsx` (branches `else` qui supposent `Texte`). C'est attendu : elles sont corrigées aux tâches 6, 8 et 13. Noter la liste ; ne rien corriger ici.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json .gitignore scripts/copier-mathlive.mjs src/model/types.ts
git commit -m "feat(maths): dépendances MathJax/MathLive et types des objets mathématiques"
```

---

### Task 2: Géométrie et saisie des opérations posées

**Files:**
- Create: `src/maths/operation.ts`
- Test: `src/maths/operation.test.ts`

- [ ] **Step 1: Test qui échoue**

```ts
import { describe, it, expect } from 'vitest';
import {
  CASE_MM, RETENUE_MM, creerOperation, geometrieOperation, couleurColonne, operateursPour,
  decimalesPermises, chiffresDiviseurMax, voisin, ecrireCellule, valeurCellule, saisieValide,
  cleDepart, directionSaisie, type ParamsOperation,
} from './operation';

const params = (p: Partial<ParamsOperation> = {}): ParamsOperation => ({
  operateur: '+', colonnes: 3, lignes: 3, virgule: null, chiffresDiviseur: 1, couleurs: true, ...p,
});

describe('operation', () => {
  it('opérateurs, décimales et diviseur selon le niveau', () => {
    expect(operateursPour('p1p2')).toEqual(['+', '-']);
    expect(operateursPour('p3p6')).toEqual(['+', '-', '×', '÷']);
    expect(decimalesPermises('p3p6')).toBe(false);
    expect(decimalesPermises('secondaire')).toBe(true);
    expect(chiffresDiviseurMax('p3p6')).toBe(1);
    expect(chiffresDiviseurMax('secondaire')).toBe(3);
  });

  it('creerOperation : cases vides, retenues sauf pour ÷', () => {
    const o = creerOperation(10, 20, params(), '#000000');
    expect(o.cases).toHaveLength(9);
    expect(o.retenues).toHaveLength(3);
    expect(o.diviseur).toEqual([]);
    const d = creerOperation(0, 0, params({ operateur: '÷', colonnes: 4, chiffresDiviseur: 2 }), '#000000');
    expect(d.retenues).toEqual([]);
    expect(d.diviseur).toHaveLength(2);
    expect(d.quotient).toHaveLength(4);
  });

  it('géométrie addition 3 × 3 : colonne du signe, retenues, barre avant le résultat', () => {
    const g = geometrieOperation(creerOperation(0, 0, params(), '#000000'));
    expect(g.largeur).toBe(CASE_MM * 4);
    expect(g.hauteur).toBe(RETENUE_MM + 3 * CASE_MM);
    expect(g.cellules.filter(c => c.zone === 'retenue')).toHaveLength(3);
    expect(g.cellules.filter(c => c.zone === 'case')).toHaveLength(9);
    expect(g.barres).toEqual([{ x1: 0, y1: RETENUE_MM + 2 * CASE_MM, x2: 40, y2: RETENUE_MM + 2 * CASE_MM }]);
    expect(g.signe).toEqual({ x: CASE_MM / 2, y: RETENUE_MM + 1.5 * CASE_MM });
    const premiere = g.cellules.find(c => c.zone === 'case' && c.index === 0)!;
    expect([premiere.x, premiere.y]).toEqual([CASE_MM, RETENUE_MM]);
  });

  it('multiplication : la barre suit toujours les deux premières lignes', () => {
    const g = geometrieOperation(creerOperation(0, 0, params({ operateur: '×', lignes: 5 }), '#000000'));
    expect(g.barres[0].y1).toBe(RETENUE_MM + 2 * CASE_MM);
  });

  it('division : potence, diviseur en haut à droite, quotient dessous', () => {
    const o = creerOperation(0, 0, params({ operateur: '÷', colonnes: 4, lignes: 3, chiffresDiviseur: 2 }), '#000000');
    const g = geometrieOperation(o);
    expect(g.signe).toBeNull();
    expect(g.cellules.filter(c => c.zone === 'case')).toHaveLength(12);
    const d0 = g.cellules.find(c => c.zone === 'diviseur' && c.index === 0)!;
    const q0 = g.cellules.find(c => c.zone === 'quotient' && c.index === 0)!;
    expect(d0.y).toBe(0);
    expect(q0.y).toBe(CASE_MM);
    expect(d0.x).toBe(q0.x);
    expect(g.largeur).toBe(4 * CASE_MM + 2 + 4 * CASE_MM);
    expect(g.hauteur).toBe(3 * CASE_MM);
    expect(g.barres).toHaveLength(2);
  });

  it('virgule : trait entre partie entière et décimales', () => {
    const g = geometrieOperation(creerOperation(0, 0, params({ colonnes: 4, virgule: 1 }), '#000000'));
    expect(g.virgule).toEqual({ x: CASE_MM + 3 * CASE_MM, y1: RETENUE_MM, y2: RETENUE_MM + 3 * CASE_MM });
  });

  it('couleurs des colonnes depuis la droite de la partie entière', () => {
    const o = creerOperation(0, 0, params({ colonnes: 5, virgule: 1 }), '#000000');
    // k = rang depuis les unités : 3 (milliers → bleu), 2 (centaines → rouge), 1 (dizaines → vert), 0 (unités → bleu), puis décimale
    expect([0, 1, 2, 3, 4].map(c => couleurColonne(o, c))).toEqual(['#dbeafe', '#fee2e2', '#dcfce7', '#dbeafe', '#f3e8ff']);
    expect(couleurColonne({ ...o, couleurs: false }, 0)).toBeNull();
  });

  it('saisie : un seul chiffre accepté', () => {
    expect(saisieValide('7')).toBe(true);
    expect(saisieValide('a')).toBe(false);
    expect(saisieValide('12')).toBe(false);
  });

  it('écrire / lire une cellule sans muter l’objet', () => {
    const o = creerOperation(0, 0, params(), '#000000');
    const o2 = ecrireCellule(o, 'case', 4, '5');
    expect(valeurCellule(o2, 'case', 4)).toBe('5');
    expect(valeurCellule(o, 'case', 4)).toBe('');
    expect(valeurCellule(ecrireCellule(o, 'retenue', 1, '1'), 'retenue', 1)).toBe('1');
  });

  it('navigation entre cellules', () => {
    const o = creerOperation(0, 0, params(), '#000000'); // 3 × 3
    expect(voisin(o, 'case', 4, 'gauche')).toBe('case:3');
    expect(voisin(o, 'case', 3, 'gauche')).toBeNull();
    expect(voisin(o, 'case', 1, 'haut')).toBe('retenue:1');
    expect(voisin(o, 'retenue', 1, 'bas')).toBe('case:1');
    expect(voisin(o, 'case', 8, 'bas')).toBeNull();
    const d = creerOperation(0, 0, params({ operateur: '÷', chiffresDiviseur: 2 }), '#000000');
    expect(voisin(d, 'diviseur', 0, 'bas')).toBe('quotient:0');
    expect(voisin(d, 'quotient', 1, 'haut')).toBe('diviseur:1');
    expect(voisin(d, 'quotient', 2, 'haut')).toBeNull();
  });

  it('case de départ et sens de saisie', () => {
    const o = creerOperation(0, 0, params(), '#000000');
    expect(cleDepart(o)).toBe('case:2');
    expect(directionSaisie(o, 'case')).toBe('gauche');
    expect(directionSaisie(o, 'retenue')).toBeNull();
    const d = creerOperation(0, 0, params({ operateur: '÷' }), '#000000');
    expect(cleDepart(d)).toBe('case:0');
    expect(directionSaisie(d, 'case')).toBe('droite');
  });
});
```

- [ ] **Step 2: Lancer, vérifier l'échec**

Run: `npx vitest run src/maths/operation.test.ts`
Expected: FAIL `Failed to resolve import "./operation"`.

- [ ] **Step 3: Implémenter**

`src/maths/operation.ts` :

```ts
import { nouvelId } from '../model/types';
import type { Niveau, Operateur, OperationPosee } from '../model/types';

export const CASE_MM = 10;
export const RETENUE_MM = 6;
const ECART_DIVISION_MM = 2;

export type Zone = 'case' | 'retenue' | 'diviseur' | 'quotient';
export type Direction = 'gauche' | 'droite' | 'haut' | 'bas';
export type Cellule = { zone: Zone; index: number; x: number; y: number; l: number; h: number };
export type Segment = { x1: number; y1: number; x2: number; y2: number };
export type GeometrieOperation = {
  largeur: number;
  hauteur: number;
  cellules: Cellule[];
  signe: { x: number; y: number } | null; // centre de la case du signe
  barres: Segment[];
  virgule: { x: number; y1: number; y2: number } | null;
};

export type ParamsOperation = {
  operateur: Operateur;
  colonnes: number;
  lignes: number;
  virgule: number | null;
  chiffresDiviseur: number;
  couleurs: boolean;
};

export function operateursPour(n: Niveau): Operateur[] {
  return n === 'p1p2' ? ['+', '-'] : ['+', '-', '×', '÷'];
}
export const decimalesPermises = (n: Niveau) => n === 'secondaire';
export const chiffresDiviseurMax = (n: Niveau) => (n === 'secondaire' ? 3 : 1);

const vides = (n: number) => Array<string>(n).fill('');

export function creerOperation(x: number, y: number, p: ParamsOperation, couleur: string): OperationPosee {
  const div = p.operateur === '÷';
  return {
    id: nouvelId(),
    type: 'operation',
    x,
    y,
    operateur: p.operateur,
    colonnes: p.colonnes,
    lignes: p.lignes,
    cases: vides(p.colonnes * p.lignes),
    retenues: div ? [] : vides(p.colonnes),
    virgule: p.virgule,
    diviseur: div ? vides(p.chiffresDiviseur) : [],
    quotient: div ? vides(p.colonnes) : [],
    couleurs: p.couleurs,
    couleur,
  };
}

/** Nombre de lignes au-dessus de la barre : × → les deux facteurs ; + et − → tous les nombres sauf le résultat. */
const lignesAvantBarre = (o: OperationPosee) => (o.operateur === '×' ? Math.min(2, o.lignes - 1) : o.lignes - 1);

export function geometrieOperation(o: OperationPosee): GeometrieOperation {
  const C = CASE_MM;
  const cellules: Cellule[] = [];
  if (o.operateur !== '÷') {
    const x0 = C; // colonne du signe
    const y0 = RETENUE_MM;
    for (let c = 0; c < o.colonnes; c++) cellules.push({ zone: 'retenue', index: c, x: x0 + c * C, y: 0, l: C, h: RETENUE_MM });
    for (let r = 0; r < o.lignes; r++) {
      for (let c = 0; c < o.colonnes; c++) cellules.push({ zone: 'case', index: r * o.colonnes + c, x: x0 + c * C, y: y0 + r * C, l: C, h: C });
    }
    const nb = lignesAvantBarre(o);
    const largeur = x0 + o.colonnes * C;
    return {
      largeur,
      hauteur: y0 + o.lignes * C,
      cellules,
      signe: { x: C / 2, y: y0 + (nb - 0.5) * C },
      barres: [{ x1: 0, y1: y0 + nb * C, x2: largeur, y2: y0 + nb * C }],
      virgule: virgule(o, x0, y0),
    };
  }
  for (let r = 0; r < o.lignes; r++) {
    for (let c = 0; c < o.colonnes; c++) cellules.push({ zone: 'case', index: r * o.colonnes + c, x: c * C, y: r * C, l: C, h: C });
  }
  const xd = o.colonnes * C + ECART_DIVISION_MM;
  o.diviseur.forEach((_, i) => cellules.push({ zone: 'diviseur', index: i, x: xd + i * C, y: 0, l: C, h: C }));
  o.quotient.forEach((_, i) => cellules.push({ zone: 'quotient', index: i, x: xd + i * C, y: C, l: C, h: C }));
  const largeurDroite = Math.max(o.diviseur.length, o.quotient.length) * C;
  const hauteur = Math.max(o.lignes, 2) * C;
  const xPotence = xd - ECART_DIVISION_MM / 2;
  return {
    largeur: xd + largeurDroite,
    hauteur,
    cellules,
    signe: null,
    barres: [
      { x1: xPotence, y1: 0, x2: xPotence, y2: hauteur },
      { x1: xPotence, y1: C, x2: xd + largeurDroite, y2: C },
    ],
    virgule: virgule(o, 0, 0),
  };
}

function virgule(o: OperationPosee, x0: number, y0: number) {
  if (!o.virgule || o.virgule <= 0 || o.virgule >= o.colonnes) return null;
  return { x: x0 + (o.colonnes - o.virgule) * CASE_MM, y1: y0, y2: y0 + o.lignes * CASE_MM };
}

const COULEURS_RANG = ['#dbeafe', '#dcfce7', '#fee2e2']; // unités, dizaines, centaines
const COULEUR_DECIMALE = '#f3e8ff';

export function couleurColonne(o: OperationPosee, col: number): string | null {
  if (!o.couleurs) return null;
  const k = o.colonnes - 1 - col - (o.virgule ?? 0);
  return k < 0 ? COULEUR_DECIMALE : COULEURS_RANG[k % 3];
}

export const saisieValide = (ch: string) => /^[0-9]$/.test(ch);

function tableau(o: OperationPosee, zone: Zone): string[] {
  return zone === 'case' ? o.cases : zone === 'retenue' ? o.retenues : zone === 'diviseur' ? o.diviseur : o.quotient;
}

export function valeurCellule(o: OperationPosee, zone: Zone, index: number): string {
  return tableau(o, zone)[index] ?? '';
}

export function ecrireCellule(o: OperationPosee, zone: Zone, index: number, valeur: string): OperationPosee {
  const t = tableau(o, zone).slice();
  t[index] = valeur;
  const champ = zone === 'case' ? 'cases' : zone === 'retenue' ? 'retenues' : zone;
  return { ...o, [champ]: t };
}

export const cle = (zone: Zone, index: number) => `${zone}:${index}`;

export function lireCle(k: string): { zone: Zone; index: number } {
  const [zone, index] = k.split(':');
  return { zone: zone as Zone, index: Number(index) };
}

export function voisin(o: OperationPosee, zone: Zone, index: number, dir: Direction): string | null {
  const C = o.colonnes;
  if (zone === 'case') {
    const r = Math.floor(index / C);
    const c = index % C;
    if (dir === 'gauche') return c > 0 ? cle('case', index - 1) : null;
    if (dir === 'droite') return c < C - 1 ? cle('case', index + 1) : null;
    if (dir === 'bas') return r < o.lignes - 1 ? cle('case', index + C) : null;
    if (r > 0) return cle('case', index - C);
    return o.retenues.length ? cle('retenue', c) : null;
  }
  const t = tableau(o, zone);
  if (dir === 'gauche') return index > 0 ? cle(zone, index - 1) : null;
  if (dir === 'droite') return index < t.length - 1 ? cle(zone, index + 1) : null;
  if (zone === 'retenue') return dir === 'bas' ? cle('case', index) : null;
  if (zone === 'diviseur') return dir === 'bas' && index < o.quotient.length ? cle('quotient', index) : null;
  return dir === 'haut' && index < o.diviseur.length ? cle('diviseur', index) : null;
}

/** On commence par les unités du premier nombre ; la division se lit de gauche à droite. */
export function cleDepart(o: OperationPosee): string {
  return o.operateur === '÷' ? cle('case', 0) : cle('case', o.colonnes - 1);
}

export function directionSaisie(o: OperationPosee, zone: Zone): Direction | null {
  if (zone === 'retenue') return null;
  if (zone === 'case' && o.operateur !== '÷') return 'gauche';
  return 'droite';
}

export function libelleCellule(o: OperationPosee, zone: Zone, index: number): string {
  if (zone === 'case') return `Ligne ${Math.floor(index / o.colonnes) + 1}, colonne ${(index % o.colonnes) + 1}`;
  if (zone === 'retenue') return `Retenue, colonne ${index + 1}`;
  return `${zone === 'diviseur' ? 'Diviseur' : 'Quotient'}, chiffre ${index + 1}`;
}
```

- [ ] **Step 4: Lancer, vérifier le succès**

Run: `npx vitest run src/maths/operation.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 5: Commit**

```bash
git add src/maths/operation.ts src/maths/operation.test.ts
git commit -m "feat(maths): géométrie, couleurs et saisie des opérations posées"
```

---

### Task 3: Fractions

**Files:**
- Create: `src/maths/fraction.ts`
- Test: `src/maths/fraction.test.ts`

- [ ] **Step 1: Test qui échoue**

```ts
import { describe, it, expect } from 'vitest';
import { ptVersMm } from '../lib/units';
import { creerFraction, geometrieFraction, TAILLE_FRACTION_PT } from './fraction';

describe('fraction', () => {
  it('creerFraction : vide, 16 pt', () => {
    const f = creerFraction(5, 6, '#1d4ed8');
    expect(f).toMatchObject({ type: 'fraction', x: 5, y: 6, numerateur: '', denominateur: '', taillePt: TAILLE_FRACTION_PT, couleur: '#1d4ed8' });
    expect(TAILLE_FRACTION_PT).toBe(16);
  });

  it('géométrie : largeur selon le plus long terme, barre entre les deux', () => {
    const f = { ...creerFraction(0, 0, '#000000'), numerateur: '12', denominateur: '345' };
    const g = geometrieFraction(f);
    const t = ptVersMm(16);
    expect(g.largeur).toBeCloseTo(3 * 0.6 * t + 3, 6);
    expect(g.numerateur.y).toBe(0);
    expect(g.barreY).toBeCloseTo(1.3 * t + 0.5, 6);
    expect(g.denominateur.y).toBeCloseTo(1.3 * t + 1, 6);
    expect(g.hauteur).toBeCloseTo(2 * 1.3 * t + 1, 6);
  });

  it('fraction vide : largeur d’un caractère', () => {
    const g = geometrieFraction(creerFraction(0, 0, '#000000'));
    expect(g.largeur).toBeCloseTo(0.6 * ptVersMm(16) + 3, 6);
  });
});
```

- [ ] **Step 2: Lancer, vérifier l'échec**

Run: `npx vitest run src/maths/fraction.test.ts`
Expected: FAIL `Failed to resolve import "./fraction"`.

- [ ] **Step 3: Implémenter**

`src/maths/fraction.ts` :

```ts
import { ptVersMm } from '../lib/units';
import { nouvelId } from '../model/types';
import type { Fraction } from '../model/types';

export const TAILLE_FRACTION_PT = 16;
const LARGEUR_CHIFFRE = 0.6; // en proportion de la taille de police (Arial)

type Rect = { x: number; y: number; l: number; h: number };
export type GeometrieFraction = { largeur: number; hauteur: number; numerateur: Rect; denominateur: Rect; barreY: number };

export function creerFraction(x: number, y: number, couleur: string): Fraction {
  return { id: nouvelId(), type: 'fraction', x, y, numerateur: '', denominateur: '', taillePt: TAILLE_FRACTION_PT, couleur };
}

export function geometrieFraction(f: Fraction): GeometrieFraction {
  const t = ptVersMm(f.taillePt);
  const n = Math.max(1, f.numerateur.length, f.denominateur.length);
  const largeur = n * LARGEUR_CHIFFRE * t + 3;
  const h = 1.3 * t;
  return {
    largeur,
    hauteur: 2 * h + 1,
    numerateur: { x: 0, y: 0, l: largeur, h },
    barreY: h + 0.5,
    denominateur: { x: 0, y: h + 1, l: largeur, h },
  };
}
```

- [ ] **Step 4: Lancer, vérifier le succès**

Run: `npx vitest run src/maths/fraction.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/maths/fraction.ts src/maths/fraction.test.ts
git commit -m "feat(maths): fractions"
```

---

### Task 4: Repère cartésien

**Files:**
- Create: `src/maths/repere.ts`
- Test: `src/maths/repere.test.ts`

- [ ] **Step 1: Test qui échoue**

```ts
import { describe, it, expect } from 'vitest';
import {
  MARGE_MM, creerRepere, parametresValides, geometrieRepere, versMm, versUnites, ajouterPoint,
  supprimerPoint, nomSuivant, etiquettePoint, formatNombre,
} from './repere';

const r0 = () => creerRepere(20, 30, { xmin: -2, xmax: 4, ymin: -1, ymax: 3, uniteMm: 10 }, '#000000');

describe('repere', () => {
  it('paramètres : 0 compris, entiers, taille maximale', () => {
    expect(parametresValides({ xmin: -5, xmax: 5, ymin: -5, ymax: 5, uniteMm: 10 })).toBeNull();
    expect(parametresValides({ xmin: 1, xmax: 5, ymin: -5, ymax: 5, uniteMm: 10 })).toMatch(/0/);
    expect(parametresValides({ xmin: -1.5, xmax: 5, ymin: -5, ymax: 5, uniteMm: 10 })).toMatch(/entiers/);
    expect(parametresValides({ xmin: -10, xmax: 10, ymin: -5, ymax: 5, uniteMm: 10 })).toMatch(/dépasse/);
    expect(parametresValides({ xmin: -5, xmax: 5, ymin: -5, ymax: 5, uniteMm: 7 })).toMatch(/unité/);
  });

  it('géométrie : marges, origine, graduations entières', () => {
    const g = geometrieRepere(r0());
    expect(g.largeur).toBe(6 * 10 + 2 * MARGE_MM);
    expect(g.hauteur).toBe(4 * 10 + 2 * MARGE_MM);
    expect(g.origine).toEqual({ x: 20 + MARGE_MM + 2 * 10, y: 30 + MARGE_MM + 3 * 10 }); // (0 ; 0) : 2 unités après xmin, 3 sous ymax
    expect(g.graduationsX.map(t => t.valeur)).toEqual([-2, -1, 0, 1, 2, 3, 4]);
    expect(g.graduationsY.map(t => t.valeur)).toEqual([-1, 0, 1, 2, 3]);
  });

  it('conversions mm ↔ unités (absolues sur la page)', () => {
    const r = r0();
    const p = versMm(r, 2, 1);
    expect(p).toEqual({ x: 20 + MARGE_MM + 40, y: 30 + MARGE_MM + 20 });
    const u = versUnites(r, p.x, p.y);
    expect(u.x).toBeCloseTo(2);
    expect(u.y).toBeCloseTo(1);
  });

  it('ajouterPoint : arrondi à la demi-unité, nom suivant, hors repère ignoré, doublon ignoré', () => {
    let r = r0();
    const p = versMm(r, 1.3, 2.2);
    r = ajouterPoint(r, p.x, p.y);
    expect(r.points).toEqual([{ nom: 'A', x: 1.5, y: 2 }]);
    expect(ajouterPoint(r, p.x, p.y)).toBe(r);
    const loin = versMm(r, 10, 10);
    expect(ajouterPoint(r, loin.x, loin.y)).toBe(r);
    const q = versMm(r, -1, -1);
    r = ajouterPoint(r, q.x, q.y);
    expect(r.points.map(pt => pt.nom)).toEqual(['A', 'B']);
  });

  it('supprimerPoint et nomSuivant réutilise une lettre libérée', () => {
    let r = r0();
    for (const [x, y] of [[0, 0], [1, 1], [2, 2]]) { const p = versMm(r, x, y); r = ajouterPoint(r, p.x, p.y); }
    r = supprimerPoint(r, 'B');
    expect(nomSuivant(r.points)).toBe('B');
  });

  it('étiquettes à la belge : virgule décimale, point-virgule', () => {
    expect(formatNombre(2.5)).toBe('2,5');
    expect(formatNombre(-3)).toBe('-3');
    expect(etiquettePoint({ nom: 'A', x: 2, y: 3.5 })).toBe('A(2 ; 3,5)');
  });
});
```

- [ ] **Step 2: Lancer, vérifier l'échec**

Run: `npx vitest run src/maths/repere.test.ts`
Expected: FAIL `Failed to resolve import "./repere"`.

- [ ] **Step 3: Implémenter**

`src/maths/repere.ts` :

```ts
import { nouvelId } from '../model/types';
import type { PointRepere, Repere } from '../model/types';

export const MARGE_MM = 6; // place des étiquettes autour du quadrillage
export const UNITES_MM = [5, 10, 20];
const LARGEUR_MAX_MM = 180;
const HAUTEUR_MAX_MM = 260;

export type ParamsRepere = { xmin: number; xmax: number; ymin: number; ymax: number; uniteMm: number };
export type Graduation = { valeur: number; position: number }; // position absolue en mm (x pour l'axe X, y pour l'axe Y)
export type GeometrieRepere = {
  largeur: number;
  hauteur: number;
  origine: { x: number; y: number }; // absolue, mm
  graduationsX: Graduation[];
  graduationsY: Graduation[];
};

export function parametresValides(p: ParamsRepere): string | null {
  const nombres = [p.xmin, p.xmax, p.ymin, p.ymax];
  if (!nombres.every(Number.isInteger)) return 'Les bornes doivent être des nombres entiers.';
  if (!(p.xmin <= 0 && 0 <= p.xmax && p.ymin <= 0 && 0 <= p.ymax)) return 'Chaque axe doit contenir 0 (minimum ≤ 0 ≤ maximum).';
  if (p.xmax - p.xmin < 1 || p.ymax - p.ymin < 1) return 'Chaque axe doit couvrir au moins une unité.';
  if (!UNITES_MM.includes(p.uniteMm)) return 'Choisissez une unité de 5 mm, 1 cm ou 2 cm.';
  if ((p.xmax - p.xmin) * p.uniteMm > LARGEUR_MAX_MM || (p.ymax - p.ymin) * p.uniteMm > HAUTEUR_MAX_MM) {
    return 'Le repère dépasse la page : réduisez l’étendue des axes ou l’unité.';
  }
  return null;
}

export function creerRepere(x: number, y: number, p: ParamsRepere, couleur: string): Repere {
  return { id: nouvelId(), type: 'repere', x, y, ...p, points: [], couleur };
}

export function versMm(r: Repere, ux: number, uy: number): { x: number; y: number } {
  return { x: r.x + MARGE_MM + (ux - r.xmin) * r.uniteMm, y: r.y + MARGE_MM + (r.ymax - uy) * r.uniteMm };
}

export function versUnites(r: Repere, xmm: number, ymm: number): { x: number; y: number } {
  return { x: r.xmin + (xmm - r.x - MARGE_MM) / r.uniteMm, y: r.ymax - (ymm - r.y - MARGE_MM) / r.uniteMm };
}

export function geometrieRepere(r: Repere): GeometrieRepere {
  const graduationsX: Graduation[] = [];
  for (let v = r.xmin; v <= r.xmax; v++) graduationsX.push({ valeur: v, position: versMm(r, v, 0).x });
  const graduationsY: Graduation[] = [];
  for (let v = r.ymin; v <= r.ymax; v++) graduationsY.push({ valeur: v, position: versMm(r, 0, v).y });
  return {
    largeur: (r.xmax - r.xmin) * r.uniteMm + 2 * MARGE_MM,
    hauteur: (r.ymax - r.ymin) * r.uniteMm + 2 * MARGE_MM,
    origine: versMm(r, 0, 0),
    graduationsX,
    graduationsY,
  };
}

const arrondirDemi = (v: number) => Math.round(v * 2) / 2;

export function nomSuivant(points: PointRepere[]): string {
  const pris = new Set(points.map(p => p.nom));
  for (let tour = 0; ; tour++) {
    for (let i = 0; i < 26; i++) {
      const nom = String.fromCharCode(65 + i) + (tour === 0 ? '' : String(tour));
      if (!pris.has(nom)) return nom;
    }
  }
}

/** Toucher hors du quadrillage ou sur un point existant : repère inchangé (même référence). */
export function ajouterPoint(r: Repere, xmm: number, ymm: number): Repere {
  const u = versUnites(r, xmm, ymm);
  const x = arrondirDemi(u.x);
  const y = arrondirDemi(u.y);
  if (x < r.xmin || x > r.xmax || y < r.ymin || y > r.ymax) return r;
  if (r.points.some(p => p.x === x && p.y === y)) return r;
  return { ...r, points: [...r.points, { nom: nomSuivant(r.points), x, y }] };
}

export function supprimerPoint(r: Repere, nom: string): Repere {
  return { ...r, points: r.points.filter(p => p.nom !== nom) };
}

export function formatNombre(v: number): string {
  return String(v).replace('.', ',');
}

export function etiquettePoint(p: PointRepere): string {
  return `${p.nom}(${formatNombre(p.x)} ; ${formatNombre(p.y)})`;
}
```

- [ ] **Step 4: Lancer, vérifier le succès**

Run: `npx vitest run src/maths/repere.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/maths/repere.ts src/maths/repere.test.ts
git commit -m "feat(maths): repère cartésien, points arrondis à la demi-unité"
```

---

### Task 5: Rendu des expressions (MathJax 4) et objets vides

**Files:**
- Create: `src/maths/expression.ts`, `src/maths/vide.ts`
- Test: `src/maths/expression.test.ts`, `src/maths/vide.test.ts`

Vérifié avant rédaction (Node 24, `@mathjax/src@4.1.3`) : `doc.convertPromise` existe ; `\le \pi \neq \geq`, `\frac`, `x^2` se rendent sans erreur ; une erreur TeX produit l'attribut `data-mjx-error` ; le `viewBox` est en millièmes d'em ; le SVG utilise `currentColor`. `mathjax-full@3` plante sous Node 24 : ne pas l'utiliser.

- [ ] **Step 1: Tests qui échouent**

`src/maths/expression.test.ts` :

```ts
import { describe, it, expect } from 'vitest';
import { ptVersMm } from '../lib/units';
import { latexVersSvg, dimensionsMm } from './expression';

describe('latexVersSvg', () => {
  it('rend un SVG coloré, sans currentColor, avec dimensions en em', async () => {
    const r = await latexVersSvg(String.raw`\frac{3}{4}+x^2`, '#1d4ed8');
    expect(r.svg.startsWith('<svg')).toBe(true);
    expect(r.svg).toContain('#1d4ed8');
    expect(r.svg).not.toContain('currentColor');
    expect(r.erreur).toBe(false);
    expect(r.largeurEm).toBeGreaterThan(1);
    expect(r.hauteurEm).toBeGreaterThan(0.5);
  });

  it('symboles du clavier simplifié', async () => {
    const r = await latexVersSvg(String.raw`\le \ge \neq \pi \sqrt{2} \times \div`, '#000000');
    expect(r.erreur).toBe(false);
  });

  it('LaTeX incomplet : erreur signalée, pas d’exception', async () => {
    const r = await latexVersSvg(String.raw`\frac{`, '#000000');
    expect(r.erreur).toBe(true);
  });

  it('chaîne vide : pas de SVG', async () => {
    expect(await latexVersSvg('  ', '#000000')).toEqual({ svg: '', largeurEm: 0, hauteurEm: 0, erreur: false });
  });

  it('dimensions en mm', () => {
    const d = dimensionsMm({ svg: '', largeurEm: 2, hauteurEm: 1, erreur: false }, 16);
    expect(d.largeurMm).toBeCloseTo(2 * ptVersMm(16), 6);
    expect(d.hauteurMm).toBeCloseTo(ptVersMm(16), 6);
  });
});
```

`src/maths/vide.test.ts` :

```ts
import { describe, it, expect } from 'vitest';
import { estVide } from './vide';
import { creerFraction } from './fraction';
import { creerOperation } from './operation';
import { creerRepere } from './repere';
import type { Expression } from '../model/types';

const expr = (latex: string): Expression => ({ id: 'e', type: 'expression', x: 0, y: 0, latex, taillePt: 16, couleur: '#000000', largeurMm: 0, hauteurMm: 0 });

describe('estVide', () => {
  it('fraction et expression vides', () => {
    expect(estVide(creerFraction(0, 0, '#000000'))).toBe(true);
    expect(estVide({ ...creerFraction(0, 0, '#000000'), denominateur: '4' })).toBe(false);
    expect(estVide(expr(' '))).toBe(true);
    expect(estVide(expr('x'))).toBe(false);
  });
  it('opération et repère ne sont jamais vides (posés volontairement)', () => {
    expect(estVide(creerOperation(0, 0, { operateur: '+', colonnes: 2, lignes: 3, virgule: null, chiffresDiviseur: 1, couleurs: true }, '#000000'))).toBe(false);
    expect(estVide(creerRepere(0, 0, { xmin: -1, xmax: 1, ymin: -1, ymax: 1, uniteMm: 10 }, '#000000'))).toBe(false);
  });
});
```

- [ ] **Step 2: Lancer, vérifier l'échec**

Run: `npx vitest run src/maths/expression.test.ts src/maths/vide.test.ts`
Expected: FAIL (imports introuvables).

- [ ] **Step 3: Implémenter**

`src/maths/expression.ts` :

```ts
import { mathjax } from '@mathjax/src/js/mathjax.js';
import { TeX } from '@mathjax/src/js/input/tex.js';
import { SVG } from '@mathjax/src/js/output/svg.js';
import { liteAdaptor } from '@mathjax/src/js/adaptors/liteAdaptor.js';
import { RegisterHTMLHandler } from '@mathjax/src/js/handlers/html.js';
import '@mathjax/src/js/input/tex/base/BaseConfiguration.js';
import '@mathjax/src/js/input/tex/ams/AmsConfiguration.js';
import { ptVersMm } from '../lib/units';

export type RenduExpression = { svg: string; largeurEm: number; hauteurEm: number; erreur: boolean };

// Initialisation paresseuse : ce module n'est importé qu'à la demande (outil Expression, export).
let moteur: { adaptor: ReturnType<typeof liteAdaptor>; doc: ReturnType<typeof mathjax.document> } | null = null;

function initialiser() {
  if (!moteur) {
    const adaptor = liteAdaptor();
    RegisterHTMLHandler(adaptor);
    const doc = mathjax.document('', {
      InputJax: new TeX({ packages: ['base', 'ams'] }),
      OutputJax: new SVG({ fontCache: 'none' }), // chemins autonomes : le SVG se suffit à lui-même (image, export)
    });
    moteur = { adaptor, doc };
  }
  return moteur;
}

export async function latexVersSvg(latex: string, couleur: string): Promise<RenduExpression> {
  if (!latex.trim()) return { svg: '', largeurEm: 0, hauteurEm: 0, erreur: false };
  const { adaptor, doc } = initialiser();
  const noeud = await doc.convertPromise(latex, { display: false });
  const brut = adaptor.innerHTML(noeud);
  const vb = /viewBox="([^"]+)"/.exec(brut)?.[1].split(' ').map(Number) ?? [0, 0, 1000, 1000];
  return {
    svg: brut.replace(/currentColor/g, couleur),
    largeurEm: vb[2] / 1000, // MathJax : 1 em = 1000 unités de viewBox
    hauteurEm: vb[3] / 1000,
    erreur: /data-mjx-error/.test(brut),
  };
}

export function dimensionsMm(r: RenduExpression, taillePt: number): { largeurMm: number; hauteurMm: number } {
  const em = ptVersMm(taillePt);
  return { largeurMm: r.largeurEm * em, hauteurMm: r.hauteurEm * em };
}
```

Si `tsc` ne trouve pas les types de `@mathjax/src/js/...` : regarder `node_modules/@mathjax/src/package.json` (`exports`, `types`) et ajuster le chemin d'import (`.../mjs/...` ou `.../js/...`) — le comportement à l'exécution est validé par les tests ci-dessus. Ne pas désactiver `strict`.

`src/maths/vide.ts` :

```ts
import type { ObjetMaths } from '../model/types';

/** Un objet vide à la fermeture de son éditeur n'est pas conservé. */
export function estVide(o: ObjetMaths): boolean {
  if (o.type === 'fraction') return !o.numerateur.trim() && !o.denominateur.trim();
  if (o.type === 'expression') return !o.latex.trim();
  return false;
}
```

- [ ] **Step 4: Lancer, vérifier le succès**

Run: `npx vitest run src/maths/expression.test.ts src/maths/vide.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/maths/expression.ts src/maths/expression.test.ts src/maths/vide.ts src/maths/vide.test.ts
git commit -m "feat(maths): rendu LaTeX → SVG avec MathJax 4, détection des objets vides"
```

---

### Task 6: Boîtes englobantes, toucher et gomme

**Files:**
- Create: `src/model/boites.ts`
- Modify: `src/model/gomme.ts`
- Test: `src/model/boites.test.ts`

- [ ] **Step 1: Test qui échoue**

`src/model/boites.test.ts` :

```ts
import { describe, it, expect } from 'vitest';
import { boiteObjet } from './boites';
import { objetTouche } from './gomme';
import { creerOperation, geometrieOperation } from '../maths/operation';
import { creerFraction, geometrieFraction } from '../maths/fraction';
import { creerRepere, geometrieRepere } from '../maths/repere';
import type { Expression, Texte } from './types';

describe('boites', () => {
  it('opération, fraction, repère : boîte = géométrie à la position de l’objet', () => {
    const o = creerOperation(10, 20, { operateur: '+', colonnes: 3, lignes: 3, virgule: null, chiffresDiviseur: 1, couleurs: true }, '#000000');
    const g = geometrieOperation(o);
    expect(boiteObjet(o)).toEqual({ x: 10, y: 20, largeur: g.largeur, hauteur: g.hauteur });
    const f = creerFraction(1, 2, '#000000');
    expect(boiteObjet(f)).toEqual({ x: 1, y: 2, largeur: geometrieFraction(f).largeur, hauteur: geometrieFraction(f).hauteur });
    const r = creerRepere(3, 4, { xmin: -1, xmax: 1, ymin: -1, ymax: 1, uniteMm: 10 }, '#000000');
    expect(boiteObjet(r)).toEqual({ x: 3, y: 4, largeur: geometrieRepere(r).largeur, hauteur: geometrieRepere(r).hauteur });
  });

  it('expression : dimensions stockées, minimum 5 mm pour rester touchable', () => {
    const e: Expression = { id: 'e', type: 'expression', x: 0, y: 0, latex: 'x', taillePt: 16, couleur: '#000000', largeurMm: 2, hauteurMm: 30 };
    expect(boiteObjet(e)).toEqual({ x: 0, y: 0, largeur: 5, hauteur: 30 });
  });

  it('objetTouche fonctionne pour les objets maths et les textes', () => {
    const o = creerOperation(10, 20, { operateur: '+', colonnes: 3, lignes: 3, virgule: null, chiffresDiviseur: 1, couleurs: true }, '#000000');
    expect(objetTouche(o, { x: 30, y: 30 }, 0)).toBe(true);
    expect(objetTouche(o, { x: 60, y: 30 }, 0)).toBe(false);
    const t: Texte = { id: 't', type: 'texte', x: 0, y: 0, largeur: 50, texte: 'a', taillePt: 14, couleur: '#000000' };
    expect(objetTouche(t, { x: 10, y: 3 }, 0)).toBe(true);
  });
});
```

- [ ] **Step 2: Lancer, vérifier l'échec**

Run: `npx vitest run src/model/boites.test.ts`
Expected: FAIL `Failed to resolve import "./boites"`.

- [ ] **Step 3: Implémenter**

`src/model/boites.ts` :

```ts
import { ptVersMm } from '../lib/units';
import { geometrieFraction } from '../maths/fraction';
import { geometrieOperation } from '../maths/operation';
import { geometrieRepere } from '../maths/repere';
import type { Objet, Texte, Trait } from './types';

export type Boite = { x: number; y: number; largeur: number; hauteur: number };
export type ObjetBoite = Exclude<Objet, Trait>;

/** Hauteur approximative : une ligne par saut de ligne explicite, interligne 1,5. */
export function hauteurTexte(t: Texte): number {
  const lignes = Math.max(1, t.texte.split('\n').length);
  return lignes * ptVersMm(t.taillePt) * 1.5;
}

export function boiteObjet(o: ObjetBoite): Boite {
  switch (o.type) {
    case 'texte':
      return { x: o.x, y: o.y, largeur: o.largeur, hauteur: hauteurTexte(o) };
    case 'operation': {
      const g = geometrieOperation(o);
      return { x: o.x, y: o.y, largeur: g.largeur, hauteur: g.hauteur };
    }
    case 'fraction': {
      const g = geometrieFraction(o);
      return { x: o.x, y: o.y, largeur: g.largeur, hauteur: g.hauteur };
    }
    case 'expression':
      return { x: o.x, y: o.y, largeur: Math.max(5, o.largeurMm), hauteur: Math.max(5, o.hauteurMm) };
    case 'repere': {
      const g = geometrieRepere(o);
      return { x: o.x, y: o.y, largeur: g.largeur, hauteur: g.hauteur };
    }
  }
}
```

Dans `src/model/gomme.ts` :
1. Supprimer la fonction `hauteurTexte` et la fonction `texteTouche`, et l'import `ptVersMm` devenu inutile.
2. Ajouter en tête :

```ts
import { boiteObjet, hauteurTexte } from './boites';
export { hauteurTexte };
```

3. Remplacer `objetTouche` par :

```ts
export function objetTouche(o: Objet, p: Point, rayon: number): boolean {
  if (o.type === 'trait') return traitTouche(o, p, rayon);
  const b = boiteObjet(o);
  return p.x >= b.x - rayon && p.x <= b.x + b.largeur + rayon && p.y >= b.y - rayon && p.y <= b.y + b.hauteur + rayon;
}
```

4. Retirer `Texte` de l'import de types s'il n'est plus utilisé.

- [ ] **Step 4: Lancer, vérifier le succès**

Run: `npx vitest run src/model`
Expected: PASS (dont `gomme.test.ts` inchangé et `boites.test.ts`, 3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/model/boites.ts src/model/boites.test.ts src/model/gomme.ts
git commit -m "feat(maths): boîtes englobantes, gomme et toucher pour tous les objets"
```

---

### Task 7: Outils mathématiques par niveau

**Files:**
- Modify: `src/model/outils.ts`, `src/model/outils.test.ts`

- [ ] **Step 1: Remplacer le test**

`src/model/outils.test.ts` :

```ts
import { describe, it, expect } from 'vitest';
import { outilsPour, OUTILS, OUTIL_TYPE } from './outils';

describe('outils', () => {
  it('P1-P2 : pas de gomme fine, de déplacement, de fraction, d’expression ni de repère', () => {
    expect(outilsPour('p1p2').map(o => o.id)).toEqual(['main', 'stylo', 'gomme-objet', 'texte', 'operation']);
  });
  it('P3-P6 : opérations et fractions, pas d’expression ni de repère', () => {
    const ids = outilsPour('p3p6').map(o => o.id);
    expect(ids).toContain('fraction');
    expect(ids).not.toContain('expression');
    expect(ids).not.toContain('repere');
  });
  it('secondaire : tous les outils', () => {
    expect(outilsPour('secondaire')).toHaveLength(OUTILS.length);
  });
  it('chaque outil a un libellé et une aide', () => {
    for (const o of OUTILS) {
      expect(o.libelle.length).toBeGreaterThan(0);
      expect(o.aide.length).toBeGreaterThan(0);
    }
  });
  it('OUTIL_TYPE relie les outils de création à leur type d’objet', () => {
    expect(OUTIL_TYPE).toEqual({ texte: 'texte', operation: 'operation', fraction: 'fraction', expression: 'expression', repere: 'repere' });
  });
});
```

- [ ] **Step 2: Lancer, vérifier l'échec**

Run: `npx vitest run src/model/outils.test.ts`
Expected: FAIL (`OUTIL_TYPE` non exporté, liste P1-P2 différente).

- [ ] **Step 3: Implémenter**

Dans `src/model/outils.ts` :

```ts
import type { Niveau, Objet } from './types';

export type OutilId =
  | 'main' | 'stylo' | 'gomme-objet' | 'gomme-partielle' | 'texte' | 'deplacer'
  | 'operation' | 'fraction' | 'expression' | 'repere';
```

Ajouter à la fin du tableau `OUTILS` :

```ts
  { id: 'operation', libelle: 'Opération', aide: 'Toucher la page pour poser une opération en colonnes ; toucher une opération pour la compléter', niveaux: TOUS },
  { id: 'fraction', libelle: 'Fraction', aide: 'Toucher la page pour écrire une fraction', niveaux: ['p3p6', 'secondaire'] },
  { id: 'expression', libelle: 'Expression', aide: 'Écrire une expression mathématique avec le clavier mathématique', niveaux: ['secondaire'] },
  { id: 'repere', libelle: 'Repère', aide: 'Poser un repère cartésien, puis toucher le repère pour placer des points', niveaux: ['secondaire'] },
```

Et après `outilsPour` :

```ts
/** Outils qui créent un objet en touchant la page, et le modifient ou le déplacent ensuite. */
export const OUTIL_TYPE: Partial<Record<OutilId, Exclude<Objet['type'], 'trait'>>> = {
  texte: 'texte',
  operation: 'operation',
  fraction: 'fraction',
  expression: 'expression',
  repere: 'repere',
};
```

- [ ] **Step 4: Lancer, vérifier le succès**

Run: `npx vitest run src/model/outils.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/model/outils.ts src/model/outils.test.ts
git commit -m "feat(maths): outils Opération, Fraction, Expression, Repère filtrés par niveau"
```

---

### Task 8: Export PDF des objets mathématiques

**Files:**
- Create: `src/pdf/origine.ts`, `src/pdf/exportMaths.ts`
- Modify: `src/pdf/export.ts`
- Test: `src/pdf/exportMaths.test.ts`

- [ ] **Step 1: Test qui échoue**

`src/pdf/exportMaths.test.ts` :

```ts
import { describe, it, expect, vi } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { exporterPdf } from './export';
import { ajouterObjet, nouveauDocVierge } from '../model/ops';
import { creerOperation, ecrireCellule } from '../maths/operation';
import { creerFraction } from '../maths/fraction';
import { ajouterPoint, creerRepere, versMm } from '../maths/repere';
import type { Expression } from '../model/types';

// PNG 1 × 1 valide
const PNG = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'));

async function texte(octets: Uint8Array): Promise<string> {
  const d = await pdfjs.getDocument({ data: octets.slice() }).promise;
  const c = await (await d.getPage(1)).getTextContent();
  return c.items.map(i => ('str' in i ? i.str : '')).join(' ');
}

const expr = (latex: string): Expression => ({ id: 'e', type: 'expression', x: 20, y: 200, latex, taillePt: 16, couleur: '#000000', largeurMm: 20, hauteurMm: 8 });

describe('export des objets maths', () => {
  it('opération : chiffres, retenue et signe écrits', async () => {
    let o = creerOperation(20, 20, { operateur: '+', colonnes: 2, lignes: 3, virgule: 1, chiffresDiviseur: 1, couleurs: true }, '#000000');
    o = ecrireCellule(ecrireCellule(ecrireCellule(o, 'case', 0, '4'), 'case', 1, '7'), 'retenue', 0, '1');
    const t = await texte(await exporterPdf(ajouterObjet(nouveauDocVierge('E', 'p3p6'), 0, o)));
    expect(t).toContain('4');
    expect(t).toContain('7');
    expect(t).toContain('1');
    expect(t).toContain('+');
  });

  it('division : signe absent, diviseur écrit', async () => {
    let o = creerOperation(20, 20, { operateur: '÷', colonnes: 3, lignes: 2, virgule: null, chiffresDiviseur: 1, couleurs: false }, '#000000');
    o = ecrireCellule(o, 'diviseur', 0, '6');
    const t = await texte(await exporterPdf(ajouterObjet(nouveauDocVierge('E', 'p3p6'), 0, o)));
    expect(t).toContain('6');
  });

  it('fraction : numérateur et dénominateur', async () => {
    const f = { ...creerFraction(30, 30, '#000000'), numerateur: '3', denominateur: '4' };
    const t = await texte(await exporterPdf(ajouterObjet(nouveauDocVierge('E', 'p3p6'), 0, f)));
    expect(t).toContain('3');
    expect(t).toContain('4');
  });

  it('repère : étiquette du point à la belge', async () => {
    let r = creerRepere(20, 60, { xmin: -2, xmax: 3, ymin: -1, ymax: 3, uniteMm: 10 }, '#000000');
    const p = versMm(r, 2, 1.5);
    r = ajouterPoint(r, p.x, p.y);
    const t = await texte(await exporterPdf(ajouterObjet(nouveauDocVierge('E', 'secondaire'), 0, r)));
    expect(t).toContain('A(2 ; 1,5)');
  });

  it('expression : image fournie par le rasteriseur', async () => {
    const rendre = vi.fn(async () => PNG);
    const out = await exporterPdf(ajouterObjet(nouveauDocVierge('E', 'secondaire'), 0, expr('x^2')), { rendreExpression: rendre });
    expect(rendre).toHaveBeenCalledOnce();
    expect((await PDFDocument.load(out)).getPageCount()).toBe(1);
  });

  it('expression sans rasteriseur (ou en échec) : LaTeX écrit en texte', async () => {
    const t1 = await texte(await exporterPdf(ajouterObjet(nouveauDocVierge('E', 'secondaire'), 0, expr('x+1'))));
    expect(t1).toContain('x+1');
    const echec = async () => { throw new Error('canvas'); };
    const t2 = await texte(await exporterPdf(ajouterObjet(nouveauDocVierge('E', 'secondaire'), 0, expr('y-2')), { rendreExpression: echec }));
    expect(t2).toContain('y-2');
  });
});
```

- [ ] **Step 2: Lancer, vérifier l'échec**

Run: `npx vitest run src/pdf/exportMaths.test.ts`
Expected: FAIL (types d'objets non dessinés / option inconnue).

- [ ] **Step 3: Extraire l'origine**

`src/pdf/origine.ts` :

```ts
import type { PDFPage } from 'pdf-lib';
import { mmVersPt } from '../lib/units';

export const K = mmVersPt(1); // pt par mm

// Le modèle part du coin haut-gauche de la zone visible (CropBox), pas de la MediaBox.
export type Origine = { x0: number; haut: number };
export const X = (r: Origine, mm: number) => r.x0 + mm * K;
export const Y = (r: Origine, mm: number) => r.haut - mm * K;

export function origine(p: PDFPage): Origine {
  const cb = p.getCropBox();
  return { x0: cb.x, haut: cb.y + cb.height };
}
```

Déplacer aussi dans `origine.ts` les deux aides `couleur` et `encodable` de `export.ts` (les couper-coller telles quelles, avec le mot-clé `export`, et les imports `rgb`, `PDFFont`, `hexVersRgb01` nécessaires) : `exportMaths.ts` les utilise, et les laisser dans `export.ts` créerait un import circulaire.

Dans `src/pdf/export.ts` : supprimer `const K = …`, le type local `Repere`, `X`, `Y`, la fonction `repere`, `couleur` et `encodable`, et importer à la place `import { K, X, Y, couleur, encodable, origine, type Origine } from './origine';`. Remplacer chaque `repere(p)` par `origine(p)`. Retirer les imports devenus inutiles (`tsc` strict les signale).

- [ ] **Step 4: Dessin des objets maths**

`src/pdf/exportMaths.ts` :

```ts
import type { PDFDocument, PDFFont, PDFPage } from 'pdf-lib';
import { rgb } from 'pdf-lib';
import { couleurColonne, geometrieOperation, valeurCellule } from '../maths/operation';
import { geometrieFraction } from '../maths/fraction';
import { MARGE_MM, etiquettePoint, formatNombre, geometrieRepere, versMm } from '../maths/repere';
import { hexVersRgb01 } from '../lib/couleurs';
import type { Expression, Fraction, OperationPosee, Repere } from '../model/types';
import { K, X, Y, couleur, encodable, type Origine } from './origine';

export type RendreExpression = (o: Expression) => Promise<Uint8Array>;

const GRILLE = rgb(0.61, 0.76, 0.87);

function texteCentre(p: PDFPage, font: PDFFont, s: string, cx: number, cy: number, taille: number, hex: string) {
  const t = encodable(font, s);
  const l = font.widthOfTextAtSize(t, taille);
  p.drawText(t, { x: cx - l / 2, y: cy - taille * 0.35, size: taille, font, color: couleur(hex) });
}

function ligne(p: PDFPage, r: Origine, x1: number, y1: number, x2: number, y2: number, epMm: number, c = GRILLE) {
  p.drawLine({ start: { x: X(r, x1), y: Y(r, y1) }, end: { x: X(r, x2), y: Y(r, y2) }, thickness: epMm * K, color: c });
}

export function dessinerOperation(p: PDFPage, r: Origine, o: OperationPosee, font: PDFFont) {
  const g = geometrieOperation(o);
  for (const c of g.cellules) {
    const x = o.x + c.x;
    const y = o.y + c.y;
    const fond = c.zone === 'case' ? couleurColonne(o, (c.index % o.colonnes)) : null;
    if (fond) {
      const f = hexVersRgb01(fond);
      p.drawRectangle({ x: X(r, x), y: Y(r, y + c.h), width: c.l * K, height: c.h * K, color: rgb(f.r, f.g, f.b) });
    }
    p.drawRectangle({ x: X(r, x), y: Y(r, y + c.h), width: c.l * K, height: c.h * K, borderColor: GRILLE, borderWidth: 0.2 * K });
    const v = valeurCellule(o, c.zone, c.index);
    if (v) texteCentre(p, font, v, X(r, x + c.l / 2), Y(r, y + c.h / 2), c.zone === 'retenue' ? 11 : 20, o.couleur);
  }
  const trait = couleur(o.couleur);
  for (const b of g.barres) ligne(p, r, o.x + b.x1, o.y + b.y1, o.x + b.x2, o.y + b.y2, 0.5, trait);
  if (g.signe) texteCentre(p, font, o.operateur === '-' ? '-' : o.operateur === '×' ? '×' : '+', X(r, o.x + g.signe.x), Y(r, o.y + g.signe.y), 20, o.couleur);
  if (g.virgule) ligne(p, r, o.x + g.virgule.x, o.y + g.virgule.y1, o.x + g.virgule.x, o.y + g.virgule.y2, 0.6, rgb(0.86, 0.15, 0.15));
}

export function dessinerFraction(p: PDFPage, r: Origine, f: Fraction, font: PDFFont) {
  const g = geometrieFraction(f);
  const cx = X(r, f.x + g.largeur / 2);
  texteCentre(p, font, f.numerateur, cx, Y(r, f.y + g.numerateur.y + g.numerateur.h / 2), f.taillePt, f.couleur);
  ligne(p, r, f.x + 0.5, f.y + g.barreY, f.x + g.largeur - 0.5, f.y + g.barreY, 0.4, couleur(f.couleur));
  texteCentre(p, font, f.denominateur, cx, Y(r, f.y + g.denominateur.y + g.denominateur.h / 2), f.taillePt, f.couleur);
}

export function dessinerRepere(p: PDFPage, r: Origine, o: Repere, font: PDFFont) {
  const g = geometrieRepere(o);
  const gauche = o.x + MARGE_MM;
  const droite = o.x + g.largeur - MARGE_MM;
  const haut = o.y + MARGE_MM;
  const bas = o.y + g.hauteur - MARGE_MM;
  const fin = rgb(0.9, 0.91, 0.92);
  for (const t of g.graduationsX) ligne(p, r, t.position, haut, t.position, bas, 0.15, fin);
  for (const t of g.graduationsY) ligne(p, r, gauche, t.position, droite, t.position, 0.15, fin);
  const c = couleur(o.couleur);
  ligne(p, r, gauche, g.origine.y, droite, g.origine.y, 0.4, c);
  ligne(p, r, g.origine.x, haut, g.origine.x, bas, 0.4, c);
  for (const t of g.graduationsX) {
    ligne(p, r, t.position, g.origine.y - 1, t.position, g.origine.y + 1, 0.3, c);
    if (t.valeur !== 0) texteCentre(p, font, formatNombre(t.valeur), X(r, t.position), Y(r, g.origine.y + 3), 8, o.couleur);
  }
  for (const t of g.graduationsY) {
    ligne(p, r, g.origine.x - 1, t.position, g.origine.x + 1, t.position, 0.3, c);
    if (t.valeur !== 0) texteCentre(p, font, formatNombre(t.valeur), X(r, g.origine.x - 3), Y(r, t.position), 8, o.couleur);
  }
  texteCentre(p, font, '0', X(r, g.origine.x - 2.5), Y(r, g.origine.y + 3), 8, o.couleur);
  for (const pt of o.points) {
    const m = versMm(o, pt.x, pt.y);
    ligne(p, r, m.x - 1.2, m.y - 1.2, m.x + 1.2, m.y + 1.2, 0.35, c);
    ligne(p, r, m.x - 1.2, m.y + 1.2, m.x + 1.2, m.y - 1.2, 0.35, c);
    const s = encodable(font, etiquettePoint(pt));
    p.drawText(s, { x: X(r, m.x + 1.5), y: Y(r, m.y - 1.5), size: 9, font, color: c });
  }
}

export async function dessinerExpression(p: PDFPage, r: Origine, o: Expression, font: PDFFont, out: PDFDocument, rendre?: RendreExpression) {
  if (rendre) {
    try {
      const png = await out.embedPng(await rendre(o));
      p.drawImage(png, { x: X(r, o.x), y: Y(r, o.y + o.hauteurMm), width: o.largeurMm * K, height: o.hauteurMm * K });
      return;
    } catch {
      // repli : le LaTeX reste lisible par l'enseignant
    }
  }
  p.drawText(encodable(font, o.latex), { x: X(r, o.x), y: Y(r, o.y) - o.taillePt, size: o.taillePt * 0.8, font, color: couleur(o.couleur) });
}
```

- [ ] **Step 5: Brancher dans `export.ts`**

Dans `src/pdf/export.ts` :

```ts
import { dessinerExpression, dessinerFraction, dessinerOperation, dessinerRepere, type RendreExpression } from './exportMaths';

export type OptionsExport = { rendreExpression?: RendreExpression };
```

Dans `dessinerObjet`, juste après le bloc `if (o.type === 'trait') { … }`, ajouter :

```ts
  if (o.type === 'operation') return dessinerOperation(p, r0, o, font);
  if (o.type === 'fraction') return dessinerFraction(p, r0, o, font);
  if (o.type === 'repere') return dessinerRepere(p, r0, o, font);
  if (o.type === 'expression') return; // asynchrone : traité dans exporterPdf
```

(`r0` est la variable `origine(p)` déjà calculée en tête de `dessinerObjet`.)

Remplacer `exporterPdf` par :

```ts
export async function exporterPdf(doc: CahierDoc, options: OptionsExport = {}): Promise<Uint8Array> {
  const out = await preparer(doc);
  out.setTitle(doc.titre);
  out.setCreator('CahierActif (PLAI)');
  const font = await out.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < doc.pages.length; i++) {
    const page = doc.pages[i];
    const p = out.getPage(i);
    dessinerFond(p, page);
    for (const o of page.objets) {
      if (o.type === 'expression') await dessinerExpression(p, origine(p), o, font, out, options.rendreExpression);
      else dessinerObjet(p, o, font);
    }
  }
  return out.save();
}
```

Le `×` et `÷` sont dans WinAnsi (Helvetica) : pas de remplacement par `?`.

- [ ] **Step 6: Lancer, vérifier le succès**

Run: `npx vitest run src/pdf && npx tsc --noEmit`
Expected: PASS (`export.test.ts` inchangé + `exportMaths.test.ts`, 6 tests). `tsc` peut encore signaler `PageVue.tsx` (corrigé tâche 13).

- [ ] **Step 7: Commit**

```bash
git add src/pdf
git commit -m "feat(maths): export PDF des opérations, fractions, repères et expressions"
```

---

### Task 9: Formes Konva des objets mathématiques

**Files:**
- Create: `src/maths/rasteriser.ts`, `src/ui/maths/Formes.tsx`

Composants visuels et fonctions navigateur : vérifiés en tâche 15.

- [ ] **Step 1: Rasteriseur (navigateur)**

`src/maths/rasteriser.ts` :

```ts
import type { Expression } from '../model/types';
import { latexVersSvg } from './expression';

const PX_PAR_MM_EXPORT = 12; // ≈ 300 dpi

function svgDimensionne(svg: string, l: number, h: number): string {
  // Les premiers width/height du texte sont ceux de la balise <svg> racine.
  return svg.replace(/width="[^"]*"/, `width="${l}"`).replace(/height="[^"]*"/, `height="${h}"`);
}

async function chargerImage(svg: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await img.decode();
  return img;
}

const cache = new Map<string, Promise<HTMLImageElement>>();

/** Image affichée à l'écran (Konva), mise en cache par contenu et couleur. */
export function imageExpression(o: Expression): Promise<HTMLImageElement> {
  const k = `${o.couleur}|${o.latex}`;
  let p = cache.get(k);
  if (!p) {
    p = latexVersSvg(o.latex, o.couleur).then(r => chargerImage(svgDimensionne(r.svg, Math.max(1, o.largeurMm * 8), Math.max(1, o.hauteurMm * 8))));
    cache.set(k, p);
    p.catch(() => cache.delete(k));
  }
  return p;
}

/** PNG ~300 dpi pour l'export PDF. */
export async function rasteriserExpression(o: Expression): Promise<Uint8Array> {
  const r = await latexVersSvg(o.latex, o.couleur);
  const l = Math.max(1, Math.round(o.largeurMm * PX_PAR_MM_EXPORT));
  const h = Math.max(1, Math.round(o.hauteurMm * PX_PAR_MM_EXPORT));
  const img = await chargerImage(svgDimensionne(r.svg, l, h));
  const c = document.createElement('canvas');
  c.width = l;
  c.height = h;
  c.getContext('2d')!.drawImage(img, 0, 0, l, h);
  const blob = await new Promise<Blob>((ok, ko) => c.toBlob(b => (b ? ok(b) : ko(new Error('PNG impossible'))), 'image/png'));
  return new Uint8Array(await blob.arrayBuffer());
}
```

- [ ] **Step 2: Formes Konva**

`src/ui/maths/Formes.tsx` :

```tsx
import { useEffect, useState } from 'react';
import { Group, Image as KImage, Line, Rect, Text } from 'react-konva';
import type Konva from 'konva';
import { couleurColonne, geometrieOperation, valeurCellule } from '../../maths/operation';
import { geometrieFraction } from '../../maths/fraction';
import { MARGE_MM, etiquettePoint, formatNombre, geometrieRepere, versMm } from '../../maths/repere';
import { ptVersMm } from '../../lib/units';
import type { Expression, Fraction, ObjetMaths, OperationPosee, Repere } from '../../model/types';

type Commun = { draggable: boolean; onDragEnd: (node: Konva.Node) => void };
const GRILLE = '#9cc2de';

function FormeOperation({ o, sansChiffres, ...g0 }: Commun & { o: OperationPosee; sansChiffres: boolean }) {
  const g = geometrieOperation(o);
  return (
    <Group x={o.x} y={o.y} draggable={g0.draggable} onDragEnd={e => g0.onDragEnd(e.target)}>
      <Rect width={g.largeur} height={g.hauteur} fill="rgba(0,0,0,0)" />
      {g.cellules.map(c => {
        const fond = c.zone === 'case' ? couleurColonne(o, c.index % o.colonnes) : null;
        const v = valeurCellule(o, c.zone, c.index);
        return (
          <Group key={`${c.zone}:${c.index}`}>
            <Rect x={c.x} y={c.y} width={c.l} height={c.h} fill={fond ?? undefined} stroke={GRILLE} strokeWidth={0.2}
              dash={c.zone === 'retenue' ? [1, 1] : undefined} />
            {!sansChiffres && v && (
              <Text x={c.x} y={c.y} width={c.l} height={c.h} text={v} align="center" verticalAlign="middle"
                fontFamily="Arial" fontSize={c.zone === 'retenue' ? 4 : 7} fill={o.couleur} />
            )}
          </Group>
        );
      })}
      {g.barres.map((b, i) => <Line key={i} points={[b.x1, b.y1, b.x2, b.y2]} stroke={o.couleur} strokeWidth={0.5} />)}
      {g.signe && (
        <Text x={g.signe.x - 5} y={g.signe.y - 5} width={10} height={10} text={o.operateur === '-' ? '−' : o.operateur}
          align="center" verticalAlign="middle" fontFamily="Arial" fontSize={7} fill={o.couleur} />
      )}
      {g.virgule && <Line points={[g.virgule.x, g.virgule.y1, g.virgule.x, g.virgule.y2]} stroke="#dc2626" strokeWidth={0.6} />}
    </Group>
  );
}

function FormeFraction({ o, ...g0 }: Commun & { o: Fraction }) {
  const g = geometrieFraction(o);
  const t = ptVersMm(o.taillePt);
  return (
    <Group x={o.x} y={o.y} draggable={g0.draggable} onDragEnd={e => g0.onDragEnd(e.target)}>
      <Rect width={g.largeur} height={g.hauteur} fill="rgba(0,0,0,0)" />
      <Text width={g.largeur} height={g.numerateur.h} text={o.numerateur} align="center" verticalAlign="middle" fontFamily="Arial" fontSize={t} fill={o.couleur} />
      <Line points={[0.5, g.barreY, g.largeur - 0.5, g.barreY]} stroke={o.couleur} strokeWidth={0.4} />
      <Text y={g.denominateur.y} width={g.largeur} height={g.denominateur.h} text={o.denominateur} align="center" verticalAlign="middle" fontFamily="Arial" fontSize={t} fill={o.couleur} />
    </Group>
  );
}

function FormeRepere({ o, ...g0 }: Commun & { o: Repere }) {
  const g = geometrieRepere(o);
  // Coordonnées relatives au groupe placé en (o.x, o.y).
  const rx = (x: number) => x - o.x;
  const ry = (y: number) => y - o.y;
  const gauche = MARGE_MM;
  const droite = g.largeur - MARGE_MM;
  const haut = MARGE_MM;
  const bas = g.hauteur - MARGE_MM;
  const ox = rx(g.origine.x);
  const oy = ry(g.origine.y);
  return (
    <Group x={o.x} y={o.y} draggable={g0.draggable} onDragEnd={e => g0.onDragEnd(e.target)}>
      <Rect width={g.largeur} height={g.hauteur} fill="rgba(0,0,0,0)" />
      {g.graduationsX.map(t => <Line key={`gx${t.valeur}`} points={[rx(t.position), haut, rx(t.position), bas]} stroke="#e5e7eb" strokeWidth={0.15} />)}
      {g.graduationsY.map(t => <Line key={`gy${t.valeur}`} points={[gauche, ry(t.position), droite, ry(t.position)]} stroke="#e5e7eb" strokeWidth={0.15} />)}
      <Line points={[gauche, oy, droite, oy]} stroke={o.couleur} strokeWidth={0.4} />
      <Line points={[ox, haut, ox, bas]} stroke={o.couleur} strokeWidth={0.4} />
      {g.graduationsX.filter(t => t.valeur !== 0).map(t => (
        <Text key={`lx${t.valeur}`} x={rx(t.position) - 4} y={oy + 1.2} width={8} text={formatNombre(t.valeur)} align="center" fontFamily="Arial" fontSize={2.8} fill={o.couleur} />
      ))}
      {g.graduationsY.filter(t => t.valeur !== 0).map(t => (
        <Text key={`ly${t.valeur}`} x={ox - 9} y={ry(t.position) - 1.4} width={7.5} text={formatNombre(t.valeur)} align="right" fontFamily="Arial" fontSize={2.8} fill={o.couleur} />
      ))}
      <Text x={ox - 4} y={oy + 1.2} width={3.5} text="0" align="right" fontFamily="Arial" fontSize={2.8} fill={o.couleur} />
      {o.points.map(pt => {
        const m = versMm(o, pt.x, pt.y);
        const x = rx(m.x);
        const y = ry(m.y);
        return (
          <Group key={pt.nom}>
            <Line points={[x - 1.2, y - 1.2, x + 1.2, y + 1.2]} stroke={o.couleur} strokeWidth={0.35} />
            <Line points={[x - 1.2, y + 1.2, x + 1.2, y - 1.2]} stroke={o.couleur} strokeWidth={0.35} />
            <Text x={x + 1.5} y={y - 4.5} text={etiquettePoint(pt)} fontFamily="Arial" fontSize={3.2} fill={o.couleur} />
          </Group>
        );
      })}
    </Group>
  );
}

function FormeExpression({ o, ...g0 }: Commun & { o: Expression }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    let vivant = true;
    if (!o.latex.trim()) { setImg(null); return; }
    import('../../maths/rasteriser').then(m => m.imageExpression(o)).then(i => vivant && setImg(i)).catch(() => vivant && setImg(null));
    return () => { vivant = false; };
  }, [o.latex, o.couleur, o.largeurMm, o.hauteurMm]);
  return (
    <Group x={o.x} y={o.y} draggable={g0.draggable} onDragEnd={e => g0.onDragEnd(e.target)}>
      <Rect width={Math.max(5, o.largeurMm)} height={Math.max(5, o.hauteurMm)} fill="rgba(0,0,0,0)" />
      {img ? (
        <KImage image={img} width={o.largeurMm} height={o.hauteurMm} />
      ) : (
        <Text text={o.latex} fontFamily="Arial" fontSize={ptVersMm(o.taillePt) * 0.8} fill={o.couleur} />
      )}
    </Group>
  );
}

type Props = Commun & { o: ObjetMaths; enEdition: boolean };

/** Objet en cours d'édition : la saisie HTML se superpose ; on ne garde que la grille (opération) ou le repère. */
export function FormeMaths({ o, enEdition, ...commun }: Props) {
  if (o.type === 'operation') return <FormeOperation o={o} sansChiffres={enEdition} {...commun} />;
  if (o.type === 'repere') return <FormeRepere o={o} {...commun} />;
  if (enEdition) return null;
  if (o.type === 'fraction') return <FormeFraction o={o} {...commun} />;
  return <FormeExpression o={o} {...commun} />;
}
```

- [ ] **Step 3: Vérifier la compilation de ces fichiers**

Run: `npx tsc --noEmit 2>&1 | grep -E "maths/(Formes|rasteriser)" || echo "aucune erreur dans les nouveaux fichiers"`
Expected: `aucune erreur dans les nouveaux fichiers`.

- [ ] **Step 4: Commit**

```bash
git add src/maths/rasteriser.ts src/ui/maths/Formes.tsx
git commit -m "feat(maths): formes Konva des opérations, fractions, repères et expressions"
```

---

### Task 10: Opérations posées — dialogue, pavé numérique, éditeur

**Files:**
- Create: `src/ui/maths/DialogueOperation.tsx`, `src/ui/maths/PaveNumerique.tsx`, `src/ui/maths/EditeurOperation.tsx`

- [ ] **Step 1: Dialogue de création**

`src/ui/maths/DialogueOperation.tsx` :

```tsx
import { useState } from 'react';
import { chiffresDiviseurMax, decimalesPermises, operateursPour, type ParamsOperation } from '../../maths/operation';
import type { Niveau, Operateur } from '../../model/types';

const NOMS: Record<Operateur, string> = { '+': 'Addition (+)', '-': 'Soustraction (−)', '×': 'Multiplication (×)', '÷': 'Division (÷)' };

type Props = { niveau: Niveau; onValider: (p: ParamsOperation) => void; onAnnuler: () => void };

function Nombre({ id, label, aide, valeur, min, max, onChange }: { id: string; label: string; aide: string; valeur: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="mb-3">
      <label htmlFor={id} className="block font-semibold">{label}</label>
      <div className="flex items-center gap-2">
        <button type="button" className="plai-btn min-h-[44px] min-w-[44px]" aria-label={`${label} : moins`} onClick={() => onChange(Math.max(min, valeur - 1))}>−</button>
        <input id={id} type="number" inputMode="numeric" min={min} max={max} value={valeur} className="plai-input w-20 text-center"
          onChange={e => onChange(Math.min(max, Math.max(min, Number(e.target.value) || min)))} />
        <button type="button" className="plai-btn min-h-[44px] min-w-[44px]" aria-label={`${label} : plus`} onClick={() => onChange(Math.min(max, valeur + 1))}>+</button>
      </div>
      <p className="text-[var(--text2)]">{aide}</p>
    </div>
  );
}

export function DialogueOperation({ niveau, onValider, onAnnuler }: Props) {
  const ops = operateursPour(niveau);
  const [operateur, setOperateur] = useState<Operateur>(ops[0]);
  const [colonnes, setColonnes] = useState(3);
  const [nombres, setNombres] = useState(2); // + et − : nombres à poser
  const [lignesCalcul, setLignesCalcul] = useState(4); // × et ÷
  const [diviseur, setDiviseur] = useState(1);
  const [decimales, setDecimales] = useState(0);
  const [couleurs, setCouleurs] = useState(true);

  const valider = () => {
    const lignes = operateur === '+' || operateur === '-' ? nombres + 1 : lignesCalcul;
    onValider({ operateur, colonnes, lignes, virgule: decimales > 0 ? decimales : null, chiffresDiviseur: diviseur, couleurs });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 p-4" role="dialog" aria-modal="true" aria-labelledby="titre-op">
      <div className="plai-card max-h-[90vh] w-full max-w-md overflow-auto bg-[var(--surface)] p-5">
        <h2 id="titre-op" className="mb-3 font-serif text-2xl">Poser une opération</h2>
        <fieldset className="mb-3">
          <legend className="font-semibold">Opération</legend>
          {ops.map(o => (
            <label key={o} className="flex min-h-[44px] items-center gap-3">
              <input type="radio" name="operateur" className="h-5 w-5" checked={operateur === o} onChange={() => setOperateur(o)} />
              {NOMS[o]}
            </label>
          ))}
        </fieldset>
        <Nombre id="op-col" label="Nombre de colonnes" valeur={colonnes} min={2} max={8} onChange={setColonnes}
          aide="Une colonne par chiffre du plus grand nombre (résultat compris). Exemple : 245 + 378 = 623 → 3 colonnes." />
        {(operateur === '+' || operateur === '-') && (
          <Nombre id="op-nb" label="Nombres à poser" valeur={nombres} min={2} max={4} onChange={setNombres}
            aide="Combien de nombres l’un sous l’autre. Une ligne de résultat est ajoutée sous la barre." />
        )}
        {operateur === '×' && (
          <Nombre id="op-l" label="Lignes de calcul" valeur={lignesCalcul} min={3} max={6} onChange={setLignesCalcul}
            aide="Les deux facteurs, puis les produits partiels et le résultat. Exemple : 46 × 23 → 5 lignes." />
        )}
        {operateur === '÷' && (
          <>
            <Nombre id="op-l" label="Lignes sous le dividende" valeur={lignesCalcul} min={2} max={8} onChange={setLignesCalcul}
              aide="Place pour les soustractions successives et les restes." />
            <Nombre id="op-div" label="Chiffres du diviseur" valeur={diviseur} min={1} max={chiffresDiviseurMax(niveau)} onChange={setDiviseur}
              aide="Exemple : 856 ÷ 4 → 1 chiffre." />
          </>
        )}
        {decimalesPermises(niveau) && (
          <Nombre id="op-dec" label="Chiffres après la virgule" valeur={decimales} min={0} max={3} onChange={setDecimales}
            aide="0 pour des nombres entiers. Un trait rouge sépare la partie entière des décimales." />
        )}
        <label className="mb-1 flex min-h-[44px] items-center gap-3">
          <input type="checkbox" className="h-5 w-5" checked={couleurs} onChange={e => setCouleurs(e.target.checked)} />
          Colonnes colorées
        </label>
        <p className="mb-4 text-[var(--text2)]">Unités en bleu, dizaines en vert, centaines en rouge : aide à garder les chiffres alignés.</p>
        <div className="flex gap-2">
          <button type="button" className="plai-btn min-h-[44px]" onClick={valider}>Poser l’opération</button>
          <button type="button" className="plai-btn min-h-[44px]" onClick={onAnnuler}>Annuler</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Pavé numérique**

`src/ui/maths/PaveNumerique.tsx` :

```tsx
import type { Direction } from '../../maths/operation';

type Props = { onChiffre: (c: string) => void; onEffacer: () => void; onDirection: (d: Direction) => void; onFin: () => void };

// onMouseDown + preventDefault : le bouton ne vole pas le focus de la case en cours.
const garde = (e: React.MouseEvent) => e.preventDefault();

export function PaveNumerique({ onChiffre, onEffacer, onDirection, onFin }: Props) {
  const b = 'plai-btn min-h-[56px] min-w-[56px] text-xl';
  const chiffre = (c: string) => <button key={c} type="button" className={b} onMouseDown={garde} onClick={() => onChiffre(c)}>{c}</button>;
  return (
    <div role="group" aria-label="Pavé numérique"
      className="fixed bottom-4 left-1/2 z-[60] grid -translate-x-1/2 grid-cols-4 gap-2 rounded-xl bg-[var(--surface)] p-3 shadow-lg">
      {['7', '8', '9'].map(chiffre)}
      <button type="button" className={b} aria-label="Case de gauche" onMouseDown={garde} onClick={() => onDirection('gauche')}>←</button>
      {['4', '5', '6'].map(chiffre)}
      <button type="button" className={b} aria-label="Case de droite" onMouseDown={garde} onClick={() => onDirection('droite')}>→</button>
      {['1', '2', '3'].map(chiffre)}
      <button type="button" className={b} aria-label="Case du dessus" onMouseDown={garde} onClick={() => onDirection('haut')}>↑</button>
      {chiffre('0')}
      <button type="button" className={`${b} col-span-2`} onMouseDown={garde} onClick={onEffacer}>Effacer</button>
      <button type="button" className={b} aria-label="Case du dessous" onMouseDown={garde} onClick={() => onDirection('bas')}>↓</button>
      <button type="button" className={`${b} col-span-4`} onMouseDown={garde} onClick={onFin}>Terminé</button>
    </div>
  );
}
```

- [ ] **Step 3: Éditeur de grille**

`src/ui/maths/EditeurOperation.tsx` :

```tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  cle, cleDepart, directionSaisie, ecrireCellule, geometrieOperation, libelleCellule, lireCle, saisieValide,
  valeurCellule, voisin, type Direction,
} from '../../maths/operation';
import type { OperationPosee } from '../../model/types';
import { PaveNumerique } from './PaveNumerique';

type Props = { o: OperationPosee; pxMm: number; onChange: (o: OperationPosee) => void; onFin: (o: OperationPosee) => void };

const FLECHES: Record<string, Direction> = { ArrowLeft: 'gauche', ArrowRight: 'droite', ArrowUp: 'haut', ArrowDown: 'bas' };

export function EditeurOperation({ o, pxMm, onChange, onFin }: Props) {
  const g = useMemo(() => geometrieOperation(o), [o]);
  const [focus, setFocus] = useState(() => cleDepart(o));
  const champs = useRef(new Map<string, HTMLInputElement>());
  const courant = useRef(o);
  courant.current = o;

  useEffect(() => {
    const t = setTimeout(() => champs.current.get(focus)?.focus(), 0);
    return () => clearTimeout(t);
  }, [focus]);

  const deplacer = (k: string, d: Direction) => {
    const { zone, index } = lireCle(k);
    const v = voisin(courant.current, zone, index, d);
    if (v) setFocus(v);
  };

  const ecrire = (k: string, ch: string) => {
    const { zone, index } = lireCle(k);
    if (ch === '') {
      onChange(ecrireCellule(courant.current, zone, index, ''));
      return;
    }
    if (!saisieValide(ch)) return;
    onChange(ecrireCellule(courant.current, zone, index, ch));
    const d = directionSaisie(courant.current, zone);
    if (d) deplacer(k, d);
  };

  return (
    <>
      <div style={{ position: 'absolute', left: o.x * pxMm, top: o.y * pxMm, width: g.largeur * pxMm, height: g.hauteur * pxMm, outline: '1px dashed #0f6e56', zIndex: 10 }}>
        {g.cellules.map(c => {
          const k = cle(c.zone, c.index);
          return (
            <input
              key={k}
              ref={el => { if (el) champs.current.set(k, el); else champs.current.delete(k); }}
              value={valeurCellule(o, c.zone, c.index)}
              inputMode="numeric"
              aria-label={libelleCellule(o, c.zone, c.index)}
              onFocus={() => setFocus(k)}
              onChange={e => ecrire(k, e.target.value.slice(-1))}
              onKeyDown={e => {
                const d = FLECHES[e.key];
                if (d) { e.preventDefault(); deplacer(k, d); }
                else if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); onFin(courant.current); }
              }}
              style={{
                position: 'absolute', left: c.x * pxMm, top: c.y * pxMm, width: c.l * pxMm, height: c.h * pxMm,
                textAlign: 'center', fontFamily: 'Arial, sans-serif', fontSize: (c.zone === 'retenue' ? 4 : 7) * pxMm,
                color: o.couleur, background: focus === k ? 'rgba(15,110,86,0.15)' : 'transparent', border: 'none', padding: 0,
              }}
            />
          );
        })}
      </div>
      <PaveNumerique
        onChiffre={ch => ecrire(focus, ch)}
        onEffacer={() => ecrire(focus, '')}
        onDirection={d => deplacer(focus, d)}
        onFin={() => onFin(courant.current)}
      />
    </>
  );
}
```

- [ ] **Step 4: Compilation**

Run: `npx tsc --noEmit 2>&1 | grep -E "ui/maths" || echo "aucune erreur dans ui/maths"`
Expected: `aucune erreur dans ui/maths`.

- [ ] **Step 5: Commit**

```bash
git add src/ui/maths/DialogueOperation.tsx src/ui/maths/PaveNumerique.tsx src/ui/maths/EditeurOperation.tsx
git commit -m "feat(maths): dialogue de création, pavé numérique et saisie des opérations posées"
```

---

### Task 11: Fractions et expressions — éditeurs

**Files:**
- Create: `src/ui/maths/EditeurFraction.tsx`, `src/maths/mathlive.ts`, `src/ui/maths/EditeurExpression.tsx`

- [ ] **Step 1: Éditeur de fraction**

`src/ui/maths/EditeurFraction.tsx` :

```tsx
import { useEffect, useRef } from 'react';
import { geometrieFraction } from '../../maths/fraction';
import { ptVersMm } from '../../lib/units';
import type { Fraction } from '../../model/types';

type Props = { o: Fraction; pxMm: number; onChange: (o: Fraction) => void; onFin: (o: Fraction) => void };

export function EditeurFraction({ o, pxMm, onChange, onFin }: Props) {
  const g = geometrieFraction(o);
  const num = useRef<HTMLInputElement>(null);
  const courant = useRef(o);
  courant.current = o;
  useEffect(() => {
    const t = setTimeout(() => num.current?.focus(), 0);
    return () => clearTimeout(t);
  }, []);
  const taille = ptVersMm(o.taillePt) * pxMm;
  const style = (y: number): React.CSSProperties => ({
    position: 'absolute', left: 0, top: y * pxMm, width: Math.max(g.largeur, 12) * pxMm, height: g.numerateur.h * pxMm,
    textAlign: 'center', fontFamily: 'Arial, sans-serif', fontSize: taille, color: o.couleur,
    background: 'transparent', border: 'none', outline: '1px dashed #0f6e56', padding: 0,
  });
  const touches = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); onFin(courant.current); }
  };
  return (
    <div style={{ position: 'absolute', left: o.x * pxMm, top: o.y * pxMm, zIndex: 10 }}>
      <input ref={num} aria-label="Numérateur" value={o.numerateur} maxLength={8} style={style(0)} onKeyDown={touches}
        onChange={e => onChange({ ...courant.current, numerateur: e.target.value })} />
      <div aria-hidden style={{ position: 'absolute', left: 0, top: g.barreY * pxMm, width: Math.max(g.largeur, 12) * pxMm, borderTop: `2px solid ${o.couleur}` }} />
      <input aria-label="Dénominateur" value={o.denominateur} maxLength={8} style={style(g.denominateur.y)} onKeyDown={touches}
        onChange={e => onChange({ ...courant.current, denominateur: e.target.value })} />
    </div>
  );
}
```

- [ ] **Step 2: Configuration MathLive**

`src/maths/mathlive.ts` :

```ts
import { MathfieldElement } from 'mathlive';

// Polices servies par l'app (scripts/copier-mathlive.mjs), pas de sons, virgule décimale belge.
MathfieldElement.fontsDirectory = '/mathlive/fonts';
MathfieldElement.soundsDirectory = null;
MathfieldElement.decimalSeparator = ',';

/** Clavier réduit : ce qu'un élève du secondaire utilise le plus souvent. */
export const CLAVIER_SIMPLE = {
  label: 'Simple',
  rows: [
    ['7', '8', '9', '+', '-', '\\times', '\\div', '(', ')'],
    ['4', '5', '6', '=', '<', '>', '\\le', '\\ge', '\\neq'],
    ['1', '2', '3', ',', 'x', 'y', '\\pi', '\\frac{#@}{#?}', '#@^{#?}'],
    ['0', '\\sqrt{#0}', '[left]', '[right]', '[backspace]'],
  ],
};

export function choisirClavier(complet: boolean) {
  window.mathVirtualKeyboard.layouts = complet ? ['numeric', 'symbols', 'alphabetic', 'greek'] : [CLAVIER_SIMPLE];
}

export function creerChampMaths(latex: string): MathfieldElement {
  choisirClavier(false);
  const mf = new MathfieldElement();
  mf.value = latex;
  mf.mathVirtualKeyboardPolicy = 'manual';
  mf.smartFence = true;
  return mf;
}

export function afficherClavier(visible: boolean) {
  if (visible) window.mathVirtualKeyboard.show();
  else window.mathVirtualKeyboard.hide();
}
```

Avant d'écrire ce fichier, vérifier dans `node_modules/mathlive/dist/types/` (fichiers `.d.ts`) les noms exacts : `MathfieldElement.fontsDirectory`, `soundsDirectory`, `decimalSeparator`, `mathVirtualKeyboardPolicy`, `smartFence`, `window.mathVirtualKeyboard.layouts/show/hide`, et la syntaxe des touches (`[left]`, `[right]`, `[backspace]`, placeholders `#@ #? #0`). Si un nom diffère en 0.111, utiliser le nom de la version installée et le noter dans le rapport ; le comportement voulu ne change pas.

- [ ] **Step 3: Éditeur d'expression**

`src/ui/maths/EditeurExpression.tsx` :

```tsx
import { useEffect, useRef, useState } from 'react';
import { ptVersMm } from '../../lib/units';
import type { Expression } from '../../model/types';

type Props = { o: Expression; pxMm: number; onChange: (o: Expression) => void; onFin: (o: Expression) => void };

export function EditeurExpression({ o, pxMm, onChange, onFin }: Props) {
  const hote = useRef<HTMLDivElement>(null);
  const courant = useRef(o);
  const rappel = useRef(onChange);
  rappel.current = onChange;
  const [complet, setComplet] = useState(false);
  const [pret, setPret] = useState(false);

  useEffect(() => {
    let vivant = true;
    let champ: HTMLElement | null = null;
    let tour = 0;
    (async () => {
      const ml = await import('../../maths/mathlive');
      const { latexVersSvg, dimensionsMm } = await import('../../maths/expression');
      if (!vivant || !hote.current) return;
      const mf = ml.creerChampMaths(courant.current.latex);
      champ = mf;
      mf.addEventListener('input', async () => {
        const n = ++tour; // ignore les rendus arrivés dans le désordre
        const latex = mf.value;
        const r = await latexVersSvg(latex, courant.current.couleur);
        if (n !== tour) return;
        courant.current = { ...courant.current, latex, ...dimensionsMm(r, courant.current.taillePt) };
        rappel.current(courant.current);
      });
      hote.current.appendChild(mf);
      setPret(true);
      setTimeout(() => { mf.focus(); ml.afficherClavier(true); }, 0);
    })();
    return () => {
      vivant = false;
      void import('../../maths/mathlive').then(ml => ml.afficherClavier(false));
      champ?.remove();
    };
  }, []);

  const basculer = async () => {
    const ml = await import('../../maths/mathlive');
    ml.choisirClavier(!complet);
    setComplet(!complet);
  };

  return (
    <div style={{ position: 'absolute', left: o.x * pxMm, top: o.y * pxMm, zIndex: 10, minWidth: 60 * pxMm }}>
      <div ref={hote} style={{ fontSize: ptVersMm(o.taillePt) * pxMm, color: o.couleur, outline: '1px dashed #0f6e56', background: 'rgba(255,255,255,0.85)' }}>
        {!pret && <span className="text-[var(--text2)]">Chargement du clavier mathématique…</span>}
      </div>
      <div className="mt-1 flex gap-2">
        <button type="button" className="plai-btn min-h-[44px]" onMouseDown={e => e.preventDefault()} onClick={basculer}>
          {complet ? 'Clavier simple' : 'Clavier complet'}
        </button>
        <button type="button" className="plai-btn min-h-[44px]" onMouseDown={e => e.preventDefault()} onClick={() => onFin(courant.current)}>Terminé</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Compilation**

Run: `npx tsc --noEmit 2>&1 | grep -E "ui/maths|maths/mathlive" || echo "aucune erreur"`
Expected: `aucune erreur`.

- [ ] **Step 5: Commit**

```bash
git add src/ui/maths/EditeurFraction.tsx src/maths/mathlive.ts src/ui/maths/EditeurExpression.tsx
git commit -m "feat(maths): éditeurs de fraction et d'expression (MathLive, clavier simple ou complet)"
```

---

### Task 12: Repère — dialogue, panneau des points, aiguillage des éditeurs

**Files:**
- Create: `src/ui/maths/DialogueRepere.tsx`, `src/ui/maths/PanneauRepere.tsx`, `src/ui/maths/EditionMaths.tsx`

- [ ] **Step 1: Dialogue du repère**

`src/ui/maths/DialogueRepere.tsx` :

```tsx
import { useState } from 'react';
import { parametresValides, type ParamsRepere } from '../../maths/repere';

type Props = { onValider: (p: ParamsRepere) => void; onAnnuler: () => void };

const CHAMPS: { cle: 'xmin' | 'xmax' | 'ymin' | 'ymax'; label: string; aide: string }[] = [
  { cle: 'xmin', label: 'x minimum', aide: 'Plus petite valeur sur l’axe horizontal (0 ou négative). Exemple : −5.' },
  { cle: 'xmax', label: 'x maximum', aide: 'Plus grande valeur sur l’axe horizontal (0 ou positive). Exemple : 5.' },
  { cle: 'ymin', label: 'y minimum', aide: 'Plus petite valeur sur l’axe vertical. Exemple : −5.' },
  { cle: 'ymax', label: 'y maximum', aide: 'Plus grande valeur sur l’axe vertical. Exemple : 5.' },
];

export function DialogueRepere({ onValider, onAnnuler }: Props) {
  const [p, setP] = useState<ParamsRepere>({ xmin: -5, xmax: 5, ymin: -5, ymax: 5, uniteMm: 10 });
  const erreur = parametresValides(p);
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 p-4" role="dialog" aria-modal="true" aria-labelledby="titre-rep">
      <div className="plai-card max-h-[90vh] w-full max-w-md overflow-auto bg-[var(--surface)] p-5">
        <h2 id="titre-rep" className="mb-3 font-serif text-2xl">Poser un repère</h2>
        <div className="grid grid-cols-2 gap-3">
          {CHAMPS.map(c => (
            <div key={c.cle}>
              <label htmlFor={`rep-${c.cle}`} className="block font-semibold">{c.label}</label>
              <input id={`rep-${c.cle}`} type="number" inputMode="numeric" step={1} className="plai-input w-full" placeholder="ex. 5"
                value={p[c.cle]} onChange={e => setP({ ...p, [c.cle]: Number(e.target.value) })} />
              <p className="text-[var(--text2)]">{c.aide}</p>
            </div>
          ))}
        </div>
        <label htmlFor="rep-unite" className="mt-3 block font-semibold">Unité</label>
        <select id="rep-unite" className="plai-input min-h-[44px]" value={p.uniteMm} onChange={e => setP({ ...p, uniteMm: Number(e.target.value) })}>
          <option value={5}>5 mm (petit repère)</option>
          <option value={10}>1 cm</option>
          <option value={20}>2 cm (grand repère)</option>
        </select>
        <p className="mb-3 text-[var(--text2)]">Distance entre deux graduations. Plus l’unité est grande, plus il est facile de placer les points.</p>
        {erreur && <div className="plai-error mb-3" role="alert">{erreur}</div>}
        <div className="flex gap-2">
          <button type="button" className="plai-btn min-h-[44px]" disabled={!!erreur} onClick={() => onValider(p)}>Poser le repère</button>
          <button type="button" className="plai-btn min-h-[44px]" onClick={onAnnuler}>Annuler</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Panneau des points**

`src/ui/maths/PanneauRepere.tsx` :

```tsx
import { etiquettePoint, supprimerPoint } from '../../maths/repere';
import type { Repere } from '../../model/types';

type Props = { o: Repere; onChange: (o: Repere) => void; onFin: (o: Repere) => void };

export function PanneauRepere({ o, onChange, onFin }: Props) {
  return (
    <div role="region" aria-label="Points du repère" className="fixed bottom-4 left-1/2 z-[60] w-[min(92vw,28rem)] -translate-x-1/2 rounded-xl bg-[var(--surface)] p-4 shadow-lg">
      <p className="mb-2">Touchez le repère pour placer un point. Il se place sur la demi-unité la plus proche.</p>
      {o.points.length === 0 ? (
        <p className="mb-2 text-[var(--text2)]">Aucun point pour l’instant.</p>
      ) : (
        <ul className="mb-2 flex flex-wrap gap-2">
          {o.points.map(p => (
            <li key={p.nom} className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-2">
              {etiquettePoint(p)}
              <button type="button" className="plai-btn min-h-[44px]" aria-label={`Supprimer le point ${p.nom}`} onClick={() => onChange(supprimerPoint(o, p.nom))}>Supprimer</button>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="plai-btn min-h-[44px]" onClick={() => onFin(o)}>Terminé</button>
    </div>
  );
}
```

- [ ] **Step 3: Aiguillage**

`src/ui/maths/EditionMaths.tsx` :

```tsx
import type { ObjetMaths } from '../../model/types';
import { EditeurExpression } from './EditeurExpression';
import { EditeurFraction } from './EditeurFraction';
import { EditeurOperation } from './EditeurOperation';
import { PanneauRepere } from './PanneauRepere';

type Props = { o: ObjetMaths; pxMm: number; onChange: (o: ObjetMaths) => void; onFin: (o: ObjetMaths) => void };

export function EditionMaths({ o, pxMm, onChange, onFin }: Props) {
  switch (o.type) {
    case 'operation': return <EditeurOperation o={o} pxMm={pxMm} onChange={onChange} onFin={onFin} />;
    case 'fraction': return <EditeurFraction o={o} pxMm={pxMm} onChange={onChange} onFin={onFin} />;
    case 'expression': return <EditeurExpression o={o} pxMm={pxMm} onChange={onChange} onFin={onFin} />;
    case 'repere': return <PanneauRepere o={o} onChange={onChange} onFin={onFin} />;
  }
}
```

- [ ] **Step 4: Compilation**

Run: `npx tsc --noEmit 2>&1 | grep -E "ui/maths" || echo "aucune erreur dans ui/maths"`
Expected: `aucune erreur dans ui/maths`.

- [ ] **Step 5: Commit**

```bash
git add src/ui/maths/DialogueRepere.tsx src/ui/maths/PanneauRepere.tsx src/ui/maths/EditionMaths.tsx
git commit -m "feat(maths): dialogue du repère, panneau des points, aiguillage des éditeurs"
```

---

### Task 13: Intégration dans la page et l'éditeur

**Files:**
- Modify: `src/ui/PageVue.tsx`, `src/ui/Editeur.tsx`

Lire `src/ui/PageVue.tsx` en entier avant de modifier : la logique d'outil Texte (création, toucher = modifier, glisser = déplacer, `texteSaisiRef`, `terminer`, `finTexte`) est le modèle à généraliser. Ne rien casser du comportement existant (stylo, gommes, texte, poignée, défilement au doigt, pointercancel, démontage des pages lointaines).

- [ ] **Step 1: Props, imports, état**

Dans `PageVue.tsx` :
- Ajouter à `Props` : `niveau: Niveau;` (importer `Niveau` depuis `../model/types`).
- Importer : `ObjetMaths` (types), `OUTIL_TYPE` (`../model/outils`), `type ObjetBoite` (`../model/boites`), `creerOperation, type ParamsOperation` (`../maths/operation`), `creerFraction` (`../maths/fraction`), `ajouterPoint, creerRepere, type ParamsRepere` (`../maths/repere`), `estVide` (`../maths/vide`), `FormeMaths` (`./maths/Formes`), `EditionMaths` (`./maths/EditionMaths`), `DialogueOperation` (`./maths/DialogueOperation`), `DialogueRepere` (`./maths/DialogueRepere`).
- Remplacer le type `TexteSaisi` par :

```ts
// Outil de création posé sur un objet de son type : glisser = déplacer, toucher sans bouger = modifier.
type ObjetSaisi = { objet: ObjetBoite; depart: Point; bouge: boolean };
type EditionMaths = { objet: ObjetMaths; nouveau: boolean };
```

- Renommer `texteSaisiRef` en `objetSaisiRef` (type `ObjetSaisi | null`) partout.
- Ajouter l'état :

```ts
  const [maths, setMaths] = useState<EditionMaths | null>(null);
  const mathsRef = useRef<EditionMaths | null>(null);
  const [dialogue, setDialogue] = useState<{ type: 'operation' | 'repere'; x: number; y: number } | null>(null);
```

- [ ] **Step 2: Ouverture, mise à jour, fermeture d'un objet maths**

Ajouter à côté de `ouvrirEdition` / `finTexte` :

```ts
  const ouvrirMaths = (e: EditionMaths) => {
    mathsRef.current = e;
    setMaths(e);
  };

  const majMaths = (objet: ObjetMaths) => {
    const ed = mathsRef.current;
    if (!ed) return;
    mathsRef.current = { ...ed, objet };
    setMaths(mathsRef.current);
  };

  // Comme finTexte : une seule validation, lit les derniers props.
  const finMaths = (objet: ObjetMaths) => {
    const ed = mathsRef.current;
    if (!ed) return;
    mathsRef.current = null;
    setMaths(null);
    const { doc, pageIndex, onCommit } = derniersProps.current;
    if (estVide(objet)) {
      if (!ed.nouveau) onCommit(supprimerObjet(doc, pageIndex, objet.id));
      return;
    }
    onCommit(ed.nouveau ? ajouterObjet(doc, pageIndex, objet) : remplacerObjet(doc, pageIndex, objet.id, [objet]));
  };

  const creer = (type: NonNullable<(typeof OUTIL_TYPE)[OutilId]>, q: Point) => {
    if (type === 'texte') {
      const largeur = Math.max(20, Math.min(80, page.largeurMm - q.x - 2));
      const x = q.x + largeur > page.largeurMm - 2 ? Math.max(0, page.largeurMm - 2 - largeur) : q.x;
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
```

(Le code de création de texte ci-dessus remplace celui qui était dans `down`.)

- [ ] **Step 3: `down` généralisé**

Dans `down`, juste après le bloc `if (editionRef.current) { … return; }`, ajouter :

```ts
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
    if (dialogue) return;
```

Puis remplacer toute la branche `} else if (p.outil === 'texte') { … }` par une branche générique placée **avant** le test `if (p.outil === 'stylo')` :

```ts
    const typeOutil = OUTIL_TYPE[p.outil];
    if (typeOutil) {
      const existant = [...objets].reverse().find(o => o.type === typeOutil && objetTouche(o, q, 1)) as ObjetBoite | undefined;
      if (existant) {
        pointeurActif.current = e.evt.pointerId;
        objetSaisiRef.current = { objet: existant, depart: q, bouge: false };
      } else {
        creer(typeOutil, q);
      }
      return;
    }
```

- [ ] **Step 4: `move` et `terminer`**

Dans `move`, la branche `saisi` reste identique mais utilise `objetSaisiRef` et `saisi.objet` :

```ts
    const saisi = objetSaisiRef.current;
    if (saisi) {
      const dx = q.x - saisi.depart.x;
      const dy = q.y - saisi.depart.y;
      if (!saisi.bouge && Math.hypot(dx, dy) < SEUIL_GLISSER) return;
      saisi.bouge = true;
      brouillonRef.current = modifierObjet(p.doc, p.pageIndex, saisi.objet.id, { x: saisi.objet.x + dx, y: saisi.objet.y + dy });
      setBrouillon(brouillonRef.current);
    } else if (traitRef.current) {
```

Dans `terminer`, remplacer le bloc `if (saisi && !saisi.bouge) { … }` par :

```ts
    const saisi = objetSaisiRef.current;
    objetSaisiRef.current = null;
    if (saisi && !saisi.bouge) {
      if (saisi.objet.type === 'texte') ouvrirEdition({ texte: saisi.objet, nouveau: false });
      else ouvrirMaths({ objet: saisi.objet, nouveau: false });
      return;
    }
```

- [ ] **Step 5: Affichage**

Calculer les objets affichés (l'objet maths en cours d'édition remplace ou complète celui du document, pour voir la grille et les points pendant la saisie) :

```ts
  const enEdition = maths?.objet ?? null;
  const objetsAffiches = !enEdition
    ? objets
    : maths!.nouveau
      ? [...objets, enEdition]
      : objets.map(o => (o.id === enEdition.id ? enEdition : o));
```

Dans `CoucheObjets` : ajouter la prop `idEdition: string | null`, et remplacer la branche finale `) : idMasque === o.id ? null : ( <Text …/> )` par :

```tsx
        ) : o.type === 'texte' ? (
          idMasque === o.id ? null : (
            <Text key={o.id} x={o.x} y={o.y} width={o.largeur} text={o.texte} fontFamily="Arial"
              fontSize={ptVersMm(o.taillePt)} lineHeight={1.5} fill={o.couleur}
              draggable={deplacable} onDragEnd={e => onDeplace(o, e.target)} />
          )
        ) : (
          <FormeMaths key={o.id} o={o} enEdition={idEdition === o.id} draggable={deplacable} onDragEnd={node => onDeplace(o, node)} />
        ),
```

et l'appel :

```tsx
          <CoucheObjets objets={objetsAffiches} deplacable={deplacable} idMasque={edition?.texte.id ?? null}
            idEdition={enEdition?.id ?? null} onDeplace={finDeplacement} />
```

Après `{edition && <EditeurTexte … />}`, ajouter :

```tsx
      {maths && <EditionMaths o={maths.objet} pxMm={p.pxMm} onChange={majMaths} onFin={finMaths} />}
      {dialogue?.type === 'operation' && (
        <DialogueOperation
          niveau={p.niveau}
          onAnnuler={() => setDialogue(null)}
          onValider={(params: ParamsOperation) => {
            const d = dialogue;
            setDialogue(null);
            ouvrirMaths({ objet: creerOperation(d.x, d.y, params, p.couleur), nouveau: true });
          }}
        />
      )}
      {dialogue?.type === 'repere' && (
        <DialogueRepere
          onAnnuler={() => setDialogue(null)}
          onValider={(params: ParamsRepere) => {
            const d = dialogue;
            setDialogue(null);
            ouvrirMaths({ objet: creerRepere(d.x, d.y, params, p.couleur), nouveau: true });
          }}
        />
      )}
```

Démontage : si la page sort de l'écran pendant une édition maths, la valider. Dans l'effet existant `[visible]`, ajouter : `if (!visible && mathsRef.current) finMaths(mathsRef.current.objet);`.

- [ ] **Step 6: `Editeur.tsx`**

- Passer `niveau={reglages.niveau}` à chaque `<PageVue … />`.
- Dans `exporter`, remplacer l'appel par :

```ts
      const octets = await exporterPdf(dernier.current, {
        rendreExpression: o => import('../maths/rasteriser').then(m => m.rasteriserExpression(o)),
      });
```

(garder le nom de variable du document déjà utilisé à cet endroit s'il diffère de `dernier.current`).

- [ ] **Step 7: Vérifications automatiques**

Run: `npx tsc --noEmit && npx vitest run && npm run build`
Expected: tout passe. Noter dans le rapport les tailles des fichiers JS produits par `vite build` (chunks MathJax / MathLive) et tout avertissement de précache Workbox (« will not be precached »). Si un chunk dépasse 5 Mo, passer `maximumFileSizeToCacheInBytes` à `8 * 1024 * 1024` dans `vite.config.ts`.

- [ ] **Step 8: Commit**

```bash
git add src/ui/PageVue.tsx src/ui/Editeur.tsx vite.config.ts
git commit -m "feat(maths): création, modification et déplacement des objets maths sur la page"
```

---

### Task 14: Revue globale

- [ ] **Step 1:** Dispatcher un relecteur sur le diff du plan 3 (depuis le commit précédant la tâche 1) : bugs de saisie (focus, pavé, StrictMode), états d'édition qui se chevauchent (texte + maths + dialogue), pertes de données (validation au démontage, retour à la bibliothèque pendant une édition), export (positions, CropBox), accessibilité (16 px, 44 px, libellés), poids des chunks. Corriger les points Critiques et Importants, relancer `npx tsc --noEmit && npx vitest run && npm run build`.

- [ ] **Step 2: Commit des corrections**

```bash
git add -A
git commit -m "fix(maths): corrections de la revue globale du plan 3"
```

---

### Task 15: Vérification navigateur et déploiement

- [ ] **Step 1: Recette dans le navigateur (aperçu `cahieractif`)**

| # | Niveau | Vérification |
|---|---|---|
| 1 | P1-P2 | Outils : Main, Stylo, Gomme, Texte, Opération. Dialogue : seulement + et −, pas de décimales. |
| 2 | P1-P2 | Poser 245 + 378 (3 colonnes, 2 nombres) : grille colorée, curseur sur les unités, la saisie part vers la gauche, pavé numérique utilisable à la souris, « Terminé » ferme ; chiffres affichés sur la grille. |
| 3 | P3-P6 | Division 856 ÷ 4 : potence, diviseur à droite, quotient dessous ; flèches ↑↓ entre diviseur et quotient. |
| 4 | P3-P6 | Fraction 3/4 : saisie, Entrée ferme, retoucher = modifier, glisser = déplacer, gomme = supprimer. |
| 5 | Secondaire | Opération avec 2 décimales : trait rouge, colonnes décimales violettes. |
| 6 | Secondaire | Expression `x^2 + \frac{1}{2} \le \pi` au clavier simple ; bascule clavier complet ; « Terminé » ; l'expression s'affiche en couleur ; retoucher = modifier. |
| 7 | Secondaire | Repère −5..5, 1 cm : toucher (2 ; 3) → A(2 ; 3) ; toucher hors repère ferme ; supprimer un point depuis le panneau. |
| 8 | Tous | Annuler / Rétablir après chaque création, modification, déplacement. |
| 9 | Tous | Export PDF : grille, chiffres, fraction, repère et expression présents et bien placés (ouvrir le PDF). |
| 10 | Tous | Fermer puis rouvrir le document : tout est conservé. Console sans erreur. |

- [ ] **Step 2: Déployer**

```bash
npx tsc --noEmit && npx vitest run && npm run build
git push origin main
```

Vérifier sur https://cahieractif.jfb4plai.com (recharger deux fois pour le service worker) les points 2, 6 et 9.

- [ ] **Step 3: Mémoire**

Mettre à jour `memory/cahieractif-session-prompt.md` : plan 3 livré, URL, points de recette restant à faire sur iPad / Android (pavé numérique, clavier MathLive au doigt).

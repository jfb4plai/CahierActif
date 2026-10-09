# CahierActif — Plan 1 : socle (PDF, annotations vectorielles, export) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Livrer une PWA installable où l'élève ouvre un PDF (ou une page vierge), y écrit à main levée et en zones de texte, gomme, annule, change le fond de page, puis exporte un PDF annoté ou un fichier `.cahier` — sans compte ni serveur.

**Architecture:** React 18 + Vite 5 + TypeScript. Modèle de document pur (positions en mm page) avec fonctions immuables et historique annuler/rétablir ; stockage local derrière une interface `StorageAdapter` (IndexedDB) ; rendu PDF par pdf.js sous une couche Konva vectorielle ; export par pdf-lib. Aucune donnée ne quitte l'appareil.

**Tech Stack:** React 18, Vite 5, TypeScript 5, Tailwind 3, Konva 9 + react-konva 18, pdfjs-dist 4.10, pdf-lib 1.17, idb 8, JSZip 3, vite-plugin-pwa 0.21, Vitest 2, fake-indexeddb 6.

**Spec :** `docs/superpowers/specs/2026-10-09-cahieractif-design.md`

---

## Découpage en plans

La spec couvre cinq sous-systèmes indépendants. Chaque plan produit une app utilisable.

| Plan | Contenu | Dépend de |
|---|---|---|
| **1 — Socle (ce document)** | Échafaudage, essai gestes iPad/Android, modèle, stockage, PDF, main levée, gommes, texte, fonds, export, bibliothèque, réglages, PWA | — |
| 2 — Géométrie | Règle, équerre, rapporteur, compas, loupe, points nommés, blocage pincement Safari | 1 (+ résultats de l'essai gestes, tâche 2) |
| 3 — Maths | Opérations posées, fractions, MathLive (secondaire), repère cartésien | 1 |
| 4 — Lecture & classe | Photo de feuille, surligneurs, cache-ligne, lecture vocale, mode verrouillé | 1 |
| 5 — Diffusion | Modes d'emploi HTML (enseignant/élève), vignette portail (RISS), recette finale 3 appareils | 2, 3, 4 |

Les plans 2 à 5 seront rédigés après la recette du plan 1, à partir des résultats réels de l'essai gestes.

## Écarts assumés par rapport à la spec (v1 du socle)

- L'historique annuler/rétablir vit en mémoire (non persisté) : rouvrir un document repart d'un historique vide.
- Export PDF : les pages source **tournées** (rotation 90/270) sont exportées avec des annotations mal placées. Limite signalée dans l'interface au moment de l'export si une page tournée est détectée (tâche 13).
- Export texte : police Helvetica (police standard PDF, métriquement proche d'Arial ; Arial n'est pas redistribuable). Caractères hors jeu WinAnsi (≤, ≥, π…) remplacés par `?` dans l'export ; ils resteront corrects à l'écran. Les expressions mathématiques du plan 3 auront leur propre rendu.

## Structure des fichiers

```
cahieractif/
├── index.html                      page hôte, polices, icône Apple
├── package.json / tsconfig.json / vite.config.ts / tailwind.config.js / postcss.config.js
├── LICENSE                         PolyForm NC (copiée de langactif)
├── scripts/icones.mjs              génère les icônes PWA (sharp)
├── public/
│   ├── plai-logo.jpg
│   ├── icone-192.png, icone-512.png, apple-touch-icon.png   (générés)
│   └── spike-gestes.html           essai gestes (tâche 2)
└── src/
    ├── main.tsx                    point d'entrée
    ├── index.css                   directives Tailwind
    ├── plai-style.css              copie de shared/css/plai-style.css
    ├── App.tsx                     navigation entre écrans + nav/footer PLAI
    ├── lib/
    │   ├── units.ts                conversions mm / pt / px
    │   ├── couleurs.ts             hex → rgb (0-1)
    │   ├── reglages.ts             niveau + mode d'entrée (localStorage)
    │   └── partage.ts              nom de fichier sûr, partage/téléchargement
    ├── model/
    │   ├── types.ts                CahierDoc, Page, Objet, Source, Niveau…
    │   ├── ops.ts                  opérations immuables sur le document
    │   ├── history.ts              annuler / rétablir générique
    │   ├── gomme.ts                détection de contact, effacement partiel
    │   ├── fonds.ts                motifs quadrillé / Seyes / pointé
    │   └── outils.ts               registre des outils filtré par niveau
    ├── input/pointerPolicy.ts      qui trace : stylet, doigt, souris
    ├── storage/
    │   ├── adapter.ts              interface StorageAdapter + MetaDoc
    │   └── indexeddb.ts            implémentation IndexedDB
    ├── fichier/cahier.ts           format .cahier (zip)
    ├── pdf/
    │   ├── info.ts                 tailles de pages (pdf-lib), erreur lisible
    │   ├── pdfjs.ts                ouverture pdf.js (navigateur)
    │   └── export.ts               PDF annoté (pdf-lib)
    └── ui/
        ├── Bibliotheque.tsx        liste, ouvrir PDF, page vierge, import .cahier
        ├── Reglages.tsx            niveau + mode d'entrée, avec aides
        ├── Editeur.tsx             historique, autosave, barre d'outils, pages
        ├── BarreOutils.tsx         outils, couleurs, épaisseurs, actions
        ├── PageVue.tsx             une page : PDF + fond + objets + saisie
        ├── PdfCanvas.tsx           rendu pdf.js d'une page
        ├── EditeurTexte.tsx        textarea superposé pour les zones de texte
        └── BanniereInstallation.tsx  avertissement iPad non installé
```

Tests : à côté du code, `src/**/*.test.ts`.

---

### Task 1: Échafaudage du projet

**Files:**
- Create: `cahieractif/package.json`, `tsconfig.json`, `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`, `index.html`, `.gitignore`, `src/main.tsx`, `src/index.css`, `src/App.tsx`
- Copy: `shared/css/plai-style.css` → `src/plai-style.css` ; `projets/portail-plai/public/plai-logo.jpg` → `public/plai-logo.jpg` ; `langactif/LICENSE` → `LICENSE`

Toutes les commandes partent de `C:\Users\jfbeg\OneDrive\claude-workspace\cahieractif` (dépôt git déjà initialisé, branche `main`, contient la spec).

- [ ] **Step 1: Créer `package.json`**

```json
{
  "name": "cahieractif",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "description": "CahierActif : annoter un PDF ou une photo de feuille comme sur un cahier (PLAI)",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "icones": "node scripts/icones.mjs"
  }
}
```

- [ ] **Step 2: Installer les dépendances**

```bash
npm i react@18.3.1 react-dom@18.3.1 konva@9 react-konva@18 pdfjs-dist@4.10.38 pdf-lib@1.17.1 idb@8 jszip@3.10.1
npm i -D vite@5 @vitejs/plugin-react@4 typescript@5 vitest@2 tailwindcss@3 postcss@8 autoprefixer@10 @types/react@18 @types/react-dom@18 @types/node@20 vite-plugin-pwa@0.21 fake-indexeddb@6 sharp@0.33
```

Expected: `added N packages`, aucune erreur `ERESOLVE`.

- [ ] **Step 3: Fichiers de configuration**

`tsconfig.json` :

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "resolveJsonModule": true,
    "types": ["vite/client"]
  },
  "include": ["src"]
}
```

`vite.config.ts` (PWA ajoutée en tâche 16) :

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: { include: ['src/**/*.test.ts'] },
});
```

`tailwind.config.js` :

```js
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('tailwindcss').Config} */
export default {
  content: [join(__dirname, 'index.html'), join(__dirname, 'src/**/*.{ts,tsx}')],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        serif: ['DM Serif Display', 'serif'],
      },
      colors: { teal: { plai: '#0f6e56' }, orange: { plai: '#f97316' } },
    },
  },
  plugins: [],
};
```

`postcss.config.js` :

```js
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default {
  plugins: {
    tailwindcss: { config: resolve(__dirname, 'tailwind.config.js') },
    autoprefixer: {},
  },
};
```

`.gitignore` :

```
node_modules
dist
.vercel
dev-dist
```

- [ ] **Step 4: Copier CSS, logo, licence**

```bash
cp ../shared/css/plai-style.css src/plai-style.css
mkdir -p public && cp ../projets/portail-plai/public/plai-logo.jpg public/plai-logo.jpg
cp ../langactif/LICENSE LICENSE
```

Vérifier que `LICENSE` commence par `# PolyForm Noncommercial` : `head -3 LICENSE`.

- [ ] **Step 5: `index.html`, `src/index.css`, `src/main.tsx`, `src/App.tsx` minimal**

`index.html` :

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/jpeg" href="/plai-logo.jpg" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#0f6e56" />
    <title>CahierActif</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/index.css` :

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body { font-size: 16px; }
```

`src/main.tsx` :

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './plai-style.css';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

`src/App.tsx` (remplacé en tâche 15) :

```tsx
export default function App() {
  return (
    <>
      <nav className="plai-nav">
        <span className="plai-nav-logo">
          <img src="/plai-logo.jpg" alt="PLAI" style={{ height: 32, width: 'auto' }} />
          CahierActif
        </span>
      </nav>
      <main className="p-6">Échafaudage prêt.</main>
    </>
  );
}
```

- [ ] **Step 6: Vérifier le build**

Run: `npx vite build`
Expected: `✓ built in …`, dossier `dist/` créé, aucune erreur.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: échafaudage React/Vite/Tailwind, branding PLAI, licence"
```

- [ ] **Step 8: Dépôt GitHub (action de JF)**

JF crée sur https://github.com/new un dépôt **vide** `CahierActif` (compte jfb4plai, privé ou public selon son choix, sans README ni licence). Puis :

```bash
git remote add origin https://github.com/jfb4plai/CahierActif.git
git push -u origin main
```

Expected: `branch 'main' set up to track 'origin/main'`.

---

### Task 2: Essai gestes iPad / Android (risque principal, à faire tôt)

But : mesurer **sur du vrai matériel**, avant tout développement d'instrument, que (1) le stylet est détecté et sa pression lue, (2) le doigt peut être ignoré après détection du stylet, (3) la paume ne trace pas, (4) deux doigts font pivoter un objet sans que Safari zoome la page.

**Files:**
- Create: `public/spike-gestes.html`

- [ ] **Step 1: Écrire la page d'essai autonome**

`public/spike-gestes.html` :

```html
<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<title>Essai gestes CahierActif</title>
<style>
  body { margin: 0; font-family: Arial, sans-serif; font-size: 16px; }
  #etat { padding: 8px; background: #0f6e56; color: #fff; }
  #zone { position: relative; height: 65vh; background: #faf9f7; border-bottom: 2px solid #0f6e56; touch-action: none; overflow: hidden; }
  #regle { position: absolute; width: 300px; height: 50px; background: rgba(15,110,86,.25); border: 2px solid #0f6e56; transform-origin: center; display: flex; align-items: center; justify-content: center; user-select: none; -webkit-user-select: none; }
  canvas { position: absolute; inset: 0; }
  #journal { padding: 8px; height: 25vh; overflow: auto; font-size: 14px; white-space: pre-wrap; }
</style>
</head>
<body>
<div id="etat">Stylet détecté : non</div>
<div id="zone"><canvas id="c"></canvas><div id="regle">règle (1 doigt : déplacer, 2 doigts : tourner)</div></div>
<div id="journal"></div>
<script>
const zone = document.getElementById('zone');
const regle = document.getElementById('regle');
const c = document.getElementById('c');
const journal = document.getElementById('journal');
const etat = document.getElementById('etat');
const ctx = c.getContext('2d');

function dimensionner() {
  const r = zone.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  c.width = r.width * dpr; c.height = r.height * dpr;
  c.style.width = r.width + 'px'; c.style.height = r.height + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.lineCap = 'round'; ctx.strokeStyle = '#1a1814';
}
dimensionner();

function log(t) { journal.textContent = t + '\n' + journal.textContent.slice(0, 4000); }

// Safari iOS : empêcher le pincement-zoom de la page
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('gesturechange', e => e.preventDefault());

let styletVu = false;
const doigts = new Map();        // pointerId -> {x, y}
let r = { x: 80, y: 120, a: 0 }; // position + angle de la règle
let depart = null;               // état au début du geste règle
let dernier = null;              // dernier point du trait en cours
let nbMoves = 0;

function appliquer() {
  regle.style.left = r.x + 'px';
  regle.style.top = r.y + 'px';
  regle.style.transform = 'rotate(' + r.a + 'rad)';
}
appliquer();

function pos(e) {
  const b = zone.getBoundingClientRect();
  return { x: e.clientX - b.left, y: e.clientY - b.top };
}
function deuxPoints() { return Array.from(doigts.values()); }
function angle(p, q) { return Math.atan2(q.y - p.y, q.x - p.x); }
function milieu(p, q) { return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }; }

function demarrerGesteRegle() {
  const pts = deuxPoints();
  if (pts.length === 1) depart = { type: 'deplacer', p0: pts[0], r0: { ...r } };
  else if (pts.length >= 2) depart = { type: 'tourner', a0: angle(pts[0], pts[1]), m0: milieu(pts[0], pts[1]), r0: { ...r } };
  else depart = null;
}

zone.addEventListener('pointerdown', e => {
  zone.setPointerCapture(e.pointerId);
  log('down type=' + e.pointerType + ' pression=' + e.pressure.toFixed(2) + ' largeur=' + e.width.toFixed(0) + ' id=' + e.pointerId);
  if (e.pointerType === 'pen' && !styletVu) { styletVu = true; etat.textContent = 'Stylet détecté : oui (le doigt ne trace plus)'; }
  const surRegle = e.target === regle;
  if (e.pointerType === 'touch' && (surRegle || doigts.size > 0)) {
    doigts.set(e.pointerId, pos(e));
    demarrerGesteRegle();
    return;
  }
  const trace = e.pointerType === 'pen' || e.pointerType === 'mouse' || (e.pointerType === 'touch' && !styletVu);
  if (trace) dernier = pos(e);
});

zone.addEventListener('pointermove', e => {
  if (doigts.has(e.pointerId)) {
    doigts.set(e.pointerId, pos(e));
    const pts = deuxPoints();
    if (depart && depart.type === 'deplacer' && pts.length === 1) {
      r.x = depart.r0.x + pts[0].x - depart.p0.x;
      r.y = depart.r0.y + pts[0].y - depart.p0.y;
    } else if (depart && depart.type === 'tourner' && pts.length >= 2) {
      const m = milieu(pts[0], pts[1]);
      r.a = depart.r0.a + angle(pts[0], pts[1]) - depart.a0;
      r.x = depart.r0.x + m.x - depart.m0.x;
      r.y = depart.r0.y + m.y - depart.m0.y;
    }
    appliquer();
    return;
  }
  if (!dernier) return;
  const p = pos(e);
  ctx.lineWidth = e.pointerType === 'pen' ? 1 + 4 * e.pressure : 2;
  ctx.beginPath(); ctx.moveTo(dernier.x, dernier.y); ctx.lineTo(p.x, p.y); ctx.stroke();
  dernier = p;
  if (e.pointerType === 'pen' && ++nbMoves % 15 === 0) log('pen pression=' + e.pressure.toFixed(2));
});

function fin(e) {
  if (doigts.delete(e.pointerId)) { demarrerGesteRegle(); return; }
  dernier = null;
}
zone.addEventListener('pointerup', fin);
zone.addEventListener('pointercancel', e => { log('cancel type=' + e.pointerType); fin(e); });
</script>
</body>
</html>
```

- [ ] **Step 2: Vérifier en local (souris)**

Run: `npx vite --host` puis ouvrir `http://localhost:5173/spike-gestes.html`.
Expected: tracer à la souris fonctionne, le journal affiche `down type=mouse`.

- [ ] **Step 3: Déployer en préversion Vercel**

```bash
npx vite build
npx vercel deploy dist --yes
```

Expected : une URL `https://cahieractif-xxxx.vercel.app`. Noter l'URL complète de l'essai : `<URL>/spike-gestes.html`.

- [ ] **Step 4: Recette sur matériel (action de JF)**

Sur **iPad + Apple Pencil (Safari)** puis sur **tablette Android + stylet (Chrome)**, ouvrir `<URL>/spike-gestes.html` et noter oui/non :

| # | Vérification | iPad | Android |
|---|---|---|---|
| 1 | Le stylet trace ; l'épaisseur varie avec la pression ; le journal montre `type=pen` et une pression qui varie | | |
| 2 | Avant le stylet, le doigt trace ; après, il ne trace plus | | |
| 3 | Paume posée pendant l'écriture au stylet : pas de trait parasite | | |
| 4 | Un doigt sur la règle la déplace | | |
| 5 | Deux doigts (le premier sur la règle) la font pivoter ; la page ne zoome pas | | |
| 6 | Même chose après « Ajouter à l'écran d'accueil » (iPad) / « Installer » (Android) | | |

- [ ] **Step 5: Consigner le résultat**

Créer `docs/essai-gestes-2026-10.md` avec le tableau rempli et les remarques de JF (appareil, version iPadOS/Android, stylet). Ce document conditionne le plan 2.

```bash
git add public/spike-gestes.html docs/essai-gestes-2026-10.md
git commit -m "test: essai gestes stylet/doigts iPad et Android"
```

---

### Task 3: Conversions d'unités

**Files:**
- Create: `src/lib/units.ts`
- Test: `src/lib/units.test.ts`

- [ ] **Step 1: Test qui échoue**

```ts
import { describe, it, expect } from 'vitest';
import { pxParMm, ptVersMm, mmVersPt, MM_PAR_PT } from './units';

describe('units', () => {
  it('à zoom 1, 25,4 mm = 96 px CSS', () => {
    expect(pxParMm(1) * 25.4).toBeCloseTo(96, 6);
  });
  it('le zoom multiplie linéairement', () => {
    expect(pxParMm(2)).toBeCloseTo(2 * pxParMm(1), 9);
  });
  it('A4 : 595,28 pt = 210 mm', () => {
    expect(ptVersMm(595.28)).toBeCloseTo(210, 1);
  });
  it('mm → pt → mm est une identité', () => {
    expect(ptVersMm(mmVersPt(42.5))).toBeCloseTo(42.5, 9);
  });
  it('1 pt = 25,4/72 mm', () => {
    expect(MM_PAR_PT).toBeCloseTo(0.352777, 5);
  });
});
```

- [ ] **Step 2: Lancer, vérifier l'échec**

Run: `npx vitest run src/lib/units.test.ts`
Expected: FAIL `Failed to resolve import "./units"`.

- [ ] **Step 3: Implémenter**

```ts
// Toutes les positions du modèle sont en millimètres de page.
export const MM_PAR_PT = 25.4 / 72;
const PX_PAR_MM_ZOOM1 = 96 / 25.4;

export function pxParMm(zoom: number): number {
  return zoom * PX_PAR_MM_ZOOM1;
}

export function ptVersMm(pt: number): number {
  return pt * MM_PAR_PT;
}

export function mmVersPt(mm: number): number {
  return mm / MM_PAR_PT;
}
```

- [ ] **Step 4: Lancer, vérifier le succès**

Run: `npx vitest run src/lib/units.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/units.ts src/lib/units.test.ts
git commit -m "feat: conversions mm/pt/px"
```

---

### Task 4: Types et opérations du document

**Files:**
- Create: `src/model/types.ts`, `src/model/ops.ts`
- Test: `src/model/ops.test.ts`

- [ ] **Step 1: Écrire les types**

`src/model/types.ts` :

```ts
export type Niveau = 'p1p2' | 'p3p6' | 'secondaire';
export type ModeEntree = 'souris' | 'stylet';

/** Point en mm page ; p = pression 0..1 si disponible. */
export type Point = { x: number; y: number; p?: number };

export type Trait = {
  id: string;
  type: 'trait';
  points: Point[];
  couleur: string; // #rrggbb
  epaisseur: number; // mm
};

export type Texte = {
  id: string;
  type: 'texte';
  x: number; // coin haut-gauche, mm
  y: number;
  largeur: number; // mm
  texte: string;
  taillePt: number;
  couleur: string;
};

/** Étendu par les plans 2 (géométrie) et 3 (maths). */
export type Objet = Trait | Texte;

export type Fond = 'aucun' | 'quadrille5' | 'quadrille10' | 'seyes' | 'pointe';

export type Page = {
  largeurMm: number;
  hauteurMm: number;
  fond: Fond;
  objets: Objet[];
};

export type ImageSource = { mime: 'image/jpeg' | 'image/png'; data: ArrayBuffer };

export type Source =
  | { type: 'pdf'; data: ArrayBuffer }
  | { type: 'vierge' }
  | { type: 'photos'; images: ImageSource[] };

export type CahierDoc = {
  id: string;
  titre: string;
  niveau: Niveau;
  cree: number;
  modifie: number;
  source: Source;
  pages: Page[];
};

export type TaillePage = { largeurMm: number; hauteurMm: number };

export const A4: TaillePage = { largeurMm: 210, hauteurMm: 297 };

export function nouvelId(): string {
  return crypto.randomUUID();
}
```

- [ ] **Step 2: Test qui échoue**

`src/model/ops.test.ts` :

```ts
import { describe, it, expect } from 'vitest';
import type { CahierDoc, Trait, Texte } from './types';
import {
  nouveauDocVierge, nouveauDocPdf, ajouterObjet, modifierObjet, supprimerObjet,
  remplacerObjet, changerFond, ajouterPageVierge,
} from './ops';

const trait = (id: string): Trait => ({
  id, type: 'trait', points: [{ x: 0, y: 0 }, { x: 10, y: 10 }], couleur: '#000000', epaisseur: 0.8,
});

describe('ops', () => {
  it('nouveauDocVierge crée une page A4 sans fond', () => {
    const d = nouveauDocVierge('Essai', 'p3p6');
    expect(d.pages).toHaveLength(1);
    expect(d.pages[0]).toEqual({ largeurMm: 210, hauteurMm: 297, fond: 'aucun', objets: [] });
    expect(d.source).toEqual({ type: 'vierge' });
    expect(d.niveau).toBe('p3p6');
  });

  it('nouveauDocPdf crée une page par taille', () => {
    const data = new ArrayBuffer(4);
    const d = nouveauDocPdf('Fiche', 'secondaire', data, [
      { largeurMm: 210, hauteurMm: 297 }, { largeurMm: 297, hauteurMm: 210 },
    ]);
    expect(d.pages.map(p => p.largeurMm)).toEqual([210, 297]);
    expect(d.source).toEqual({ type: 'pdf', data });
  });

  it('ajouterObjet ne modifie pas le document d’origine', () => {
    const d0 = nouveauDocVierge('E', 'p3p6');
    const d1 = ajouterObjet(d0, 0, trait('a'));
    expect(d0.pages[0].objets).toHaveLength(0);
    expect(d1.pages[0].objets).toHaveLength(1);
    expect(d1.modifie).toBeGreaterThanOrEqual(d0.modifie);
  });

  it('modifierObjet fusionne le patch sur le bon objet', () => {
    let d = nouveauDocVierge('E', 'p3p6');
    const t: Texte = { id: 't', type: 'texte', x: 1, y: 2, largeur: 80, texte: 'a', taillePt: 14, couleur: '#000000' };
    d = ajouterObjet(d, 0, t);
    d = modifierObjet(d, 0, 't', { texte: 'b' });
    expect((d.pages[0].objets[0] as Texte).texte).toBe('b');
    expect((d.pages[0].objets[0] as Texte).x).toBe(1);
  });

  it('supprimerObjet retire l’objet', () => {
    let d = ajouterObjet(nouveauDocVierge('E', 'p3p6'), 0, trait('a'));
    d = supprimerObjet(d, 0, 'a');
    expect(d.pages[0].objets).toHaveLength(0);
  });

  it('remplacerObjet remplace en place par 0..n objets', () => {
    let d = nouveauDocVierge('E', 'p3p6');
    d = ajouterObjet(d, 0, trait('a'));
    d = ajouterObjet(d, 0, trait('b'));
    d = remplacerObjet(d, 0, 'a', [trait('a1'), trait('a2')]);
    expect(d.pages[0].objets.map(o => o.id)).toEqual(['a1', 'a2', 'b']);
  });

  it('changerFond et ajouterPageVierge', () => {
    let d = changerFond(nouveauDocVierge('E', 'p3p6'), 0, 'seyes');
    d = ajouterPageVierge(d);
    expect(d.pages.map(p => p.fond)).toEqual(['seyes', 'aucun']);
  });

  it('page inexistante → RangeError', () => {
    const d: CahierDoc = nouveauDocVierge('E', 'p3p6');
    expect(() => ajouterObjet(d, 3, trait('a'))).toThrow(RangeError);
  });
});
```

- [ ] **Step 3: Lancer, vérifier l'échec**

Run: `npx vitest run src/model/ops.test.ts`
Expected: FAIL `Failed to resolve import "./ops"`.

- [ ] **Step 4: Implémenter**

`src/model/ops.ts` :

```ts
import { A4, nouvelId } from './types';
import type { CahierDoc, Fond, Niveau, Objet, Page, TaillePage } from './types';

function pageVide(t: TaillePage): Page {
  return { largeurMm: t.largeurMm, hauteurMm: t.hauteurMm, fond: 'aucun', objets: [] };
}

export function nouveauDocVierge(titre: string, niveau: Niveau): CahierDoc {
  const now = Date.now();
  return { id: nouvelId(), titre, niveau, cree: now, modifie: now, source: { type: 'vierge' }, pages: [pageVide(A4)] };
}

export function nouveauDocPdf(titre: string, niveau: Niveau, data: ArrayBuffer, tailles: TaillePage[]): CahierDoc {
  const now = Date.now();
  return { id: nouvelId(), titre, niveau, cree: now, modifie: now, source: { type: 'pdf', data }, pages: tailles.map(pageVide) };
}

function majPage(doc: CahierDoc, i: number, f: (p: Page) => Page): CahierDoc {
  if (i < 0 || i >= doc.pages.length) throw new RangeError(`page ${i} inexistante`);
  const pages = doc.pages.slice();
  pages[i] = f(pages[i]);
  return { ...doc, pages, modifie: Date.now() };
}

export function ajouterObjet(doc: CahierDoc, i: number, o: Objet): CahierDoc {
  return majPage(doc, i, p => ({ ...p, objets: [...p.objets, o] }));
}

export function modifierObjet(doc: CahierDoc, i: number, id: string, patch: Partial<Objet>): CahierDoc {
  return majPage(doc, i, p => ({
    ...p,
    objets: p.objets.map(o => (o.id === id ? ({ ...o, ...patch } as Objet) : o)),
  }));
}

export function supprimerObjet(doc: CahierDoc, i: number, id: string): CahierDoc {
  return majPage(doc, i, p => ({ ...p, objets: p.objets.filter(o => o.id !== id) }));
}

export function remplacerObjet(doc: CahierDoc, i: number, id: string, nouveaux: Objet[]): CahierDoc {
  return majPage(doc, i, p => ({ ...p, objets: p.objets.flatMap(o => (o.id === id ? nouveaux : [o])) }));
}

export function changerFond(doc: CahierDoc, i: number, fond: Fond): CahierDoc {
  return majPage(doc, i, p => ({ ...p, fond }));
}

export function ajouterPageVierge(doc: CahierDoc): CahierDoc {
  return { ...doc, pages: [...doc.pages, pageVide(A4)], modifie: Date.now() };
}
```

- [ ] **Step 5: Lancer, vérifier le succès**

Run: `npx vitest run src/model/ops.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 6: Commit**

```bash
git add src/model/types.ts src/model/ops.ts src/model/ops.test.ts
git commit -m "feat: modèle de document et opérations immuables"
```

---

### Task 5: Historique annuler / rétablir

**Files:**
- Create: `src/model/history.ts`
- Test: `src/model/history.test.ts`

- [ ] **Step 1: Test qui échoue**

```ts
import { describe, it, expect } from 'vitest';
import { creer, pousser, annuler, retablir, peutAnnuler, peutRetablir, LIMITE } from './history';

describe('history', () => {
  it('pousser puis annuler revient à l’état précédent', () => {
    let h = creer(1);
    h = pousser(h, 2);
    h = pousser(h, 3);
    h = annuler(h);
    expect(h.present).toBe(2);
    expect(peutRetablir(h)).toBe(true);
  });

  it('retablir rejoue', () => {
    let h = pousser(pousser(creer(1), 2), 3);
    h = retablir(annuler(annuler(h)));
    expect(h.present).toBe(2);
  });

  it('pousser après annuler vide le futur', () => {
    let h = pousser(pousser(creer(1), 2), 3);
    h = pousser(annuler(h), 9);
    expect(h.present).toBe(9);
    expect(peutRetablir(h)).toBe(false);
  });

  it('annuler sans passé ne change rien', () => {
    const h = creer('a');
    expect(annuler(h)).toBe(h);
    expect(peutAnnuler(h)).toBe(false);
  });

  it('pousser la même référence est ignoré', () => {
    const o = { a: 1 };
    const h = creer(o);
    expect(pousser(h, o)).toBe(h);
  });

  it('le passé est limité', () => {
    let h = creer(0);
    for (let i = 1; i <= LIMITE + 50; i++) h = pousser(h, i);
    expect(h.passe).toHaveLength(LIMITE);
  });
});
```

- [ ] **Step 2: Lancer, vérifier l'échec**

Run: `npx vitest run src/model/history.test.ts`
Expected: FAIL `Failed to resolve import "./history"`.

- [ ] **Step 3: Implémenter**

```ts
export type Historique<T> = { passe: T[]; present: T; futur: T[] };

export const LIMITE = 200;

export function creer<T>(present: T): Historique<T> {
  return { passe: [], present, futur: [] };
}

export function pousser<T>(h: Historique<T>, suivant: T): Historique<T> {
  if (suivant === h.present) return h;
  return { passe: [...h.passe, h.present].slice(-LIMITE), present: suivant, futur: [] };
}

export function annuler<T>(h: Historique<T>): Historique<T> {
  if (h.passe.length === 0) return h;
  return { passe: h.passe.slice(0, -1), present: h.passe[h.passe.length - 1], futur: [h.present, ...h.futur] };
}

export function retablir<T>(h: Historique<T>): Historique<T> {
  if (h.futur.length === 0) return h;
  return { passe: [...h.passe, h.present], present: h.futur[0], futur: h.futur.slice(1) };
}

export const peutAnnuler = <T>(h: Historique<T>) => h.passe.length > 0;
export const peutRetablir = <T>(h: Historique<T>) => h.futur.length > 0;
```

- [ ] **Step 4: Lancer, vérifier le succès**

Run: `npx vitest run src/model/history.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/model/history.ts src/model/history.test.ts
git commit -m "feat: historique annuler/rétablir"
```

---

### Task 6: Gommes (contact et effacement partiel)

**Files:**
- Create: `src/model/gomme.ts`
- Test: `src/model/gomme.test.ts`

- [ ] **Step 1: Test qui échoue**

```ts
import { describe, it, expect } from 'vitest';
import type { Trait, Texte } from './types';
import { distPointSegment, objetTouche, effacerPartiel, densifier, hauteurTexte } from './gomme';

const trait = (pts: [number, number][], epaisseur = 1): Trait => ({
  id: 't', type: 'trait', points: pts.map(([x, y]) => ({ x, y })), couleur: '#000000', epaisseur,
});

describe('gomme', () => {
  it('distance point-segment', () => {
    expect(distPointSegment({ x: 5, y: 3 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBeCloseTo(3);
    expect(distPointSegment({ x: -4, y: 3 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBeCloseTo(5);
  });

  it('un trait est touché si la gomme est à moins de rayon + demi-épaisseur', () => {
    const t = trait([[0, 0], [10, 0]], 2);
    expect(objetTouche(t, { x: 5, y: 3.9 }, 3)).toBe(true);
    expect(objetTouche(t, { x: 5, y: 4.1 }, 3)).toBe(false);
  });

  it('un trait d’un seul point est touchable', () => {
    expect(objetTouche(trait([[5, 5]]), { x: 6, y: 5 }, 1)).toBe(true);
  });

  it('un texte est touché dans son cadre', () => {
    const tx: Texte = { id: 'x', type: 'texte', x: 10, y: 10, largeur: 50, texte: 'a\nb', taillePt: 14, couleur: '#000000' };
    expect(hauteurTexte(tx)).toBeCloseTo(2 * 14 * (25.4 / 72) * 1.5, 6);
    expect(objetTouche(tx, { x: 30, y: 15 }, 0)).toBe(true);
    expect(objetTouche(tx, { x: 70, y: 15 }, 0)).toBe(false);
  });

  it('densifier ajoute des points tous les pasMm au plus', () => {
    const pts = densifier([{ x: 0, y: 0 }, { x: 10, y: 0 }], 1);
    expect(pts).toHaveLength(11);
    expect(pts[5].x).toBeCloseTo(5);
  });

  it('effacer au milieu coupe le trait en deux', () => {
    let n = 0;
    const res = effacerPartiel(trait([[0, 0], [20, 0]]), { x: 10, y: 0 }, 2, () => `n${n++}`);
    expect(res).toHaveLength(2);
    expect(Math.max(...res[0].points.map(p => p.x))).toBeLessThan(8.1);
    expect(Math.min(...res[1].points.map(p => p.x))).toBeGreaterThan(11.9);
    expect(res.map(r => r.id)).toEqual(['n0', 'n1']);
  });

  it('effacer loin du trait le rend intact (même objet)', () => {
    const t = trait([[0, 0], [20, 0]]);
    const res = effacerPartiel(t, { x: 10, y: 50 }, 2, () => 'x');
    expect(res).toEqual([t]);
  });

  it('effacer tout le trait ne laisse rien', () => {
    const res = effacerPartiel(trait([[0, 0], [1, 0]]), { x: 0.5, y: 0 }, 5, () => 'x');
    expect(res).toEqual([]);
  });
});
```

- [ ] **Step 2: Lancer, vérifier l'échec**

Run: `npx vitest run src/model/gomme.test.ts`
Expected: FAIL `Failed to resolve import "./gomme"`.

- [ ] **Step 3: Implémenter**

```ts
import { ptVersMm } from '../lib/units';
import type { Objet, Point, Texte, Trait } from './types';

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

export function distPointSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return dist(p, a);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
  return dist(p, { x: a.x + t * dx, y: a.y + t * dy });
}

/** Hauteur approximative : une ligne par saut de ligne explicite, interligne 1,5. */
export function hauteurTexte(t: Texte): number {
  const lignes = Math.max(1, t.texte.split('\n').length);
  return lignes * ptVersMm(t.taillePt) * 1.5;
}

function traitTouche(t: Trait, p: Point, rayon: number): boolean {
  const marge = rayon + t.epaisseur / 2;
  if (t.points.length === 1) return dist(p, t.points[0]) <= marge;
  for (let i = 1; i < t.points.length; i++) {
    if (distPointSegment(p, t.points[i - 1], t.points[i]) <= marge) return true;
  }
  return false;
}

function texteTouche(t: Texte, p: Point, rayon: number): boolean {
  return p.x >= t.x - rayon && p.x <= t.x + t.largeur + rayon && p.y >= t.y - rayon && p.y <= t.y + hauteurTexte(t) + rayon;
}

export function objetTouche(o: Objet, p: Point, rayon: number): boolean {
  return o.type === 'trait' ? traitTouche(o, p, rayon) : texteTouche(o, p, rayon);
}

/** Interpole pour qu'aucun écart entre deux points ne dépasse pasMm (traits droits = 2 points). */
export function densifier(points: Point[], pasMm: number): Point[] {
  if (points.length < 2) return points.slice();
  const out: Point[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const n = Math.ceil(dist(a, b) / pasMm);
    for (let k = 1; k <= n; k++) out.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n, p: b.p });
  }
  return out;
}

/** Retire les points à moins de `rayon` de `p` ; renvoie les morceaux restants (≥ 2 points). */
export function effacerPartiel(t: Trait, p: Point, rayon: number, idSuivant: () => string): Trait[] {
  if (!traitTouche(t, p, rayon)) return [t];
  const morceaux: Point[][] = [];
  let courant: Point[] = [];
  for (const q of densifier(t.points, 0.5)) {
    if (dist(q, p) <= rayon) {
      if (courant.length) morceaux.push(courant);
      courant = [];
    } else {
      courant.push(q);
    }
  }
  if (courant.length) morceaux.push(courant);
  return morceaux.filter(m => m.length >= 2).map(m => ({ ...t, id: idSuivant(), points: m }));
}
```

- [ ] **Step 4: Lancer, vérifier le succès**

Run: `npx vitest run src/model/gomme.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/model/gomme.ts src/model/gomme.test.ts
git commit -m "feat: gomme objet et gomme partielle"
```

---

### Task 7: Motifs de fond de page

**Files:**
- Create: `src/model/fonds.ts`
- Test: `src/model/fonds.test.ts`

- [ ] **Step 1: Test qui échoue**

```ts
import { describe, it, expect } from 'vitest';
import { motifFond, FONDS } from './fonds';

describe('fonds', () => {
  it('aucun : rien', () => {
    expect(motifFond('aucun', 210, 297)).toEqual({ lignes: [], ronds: [] });
  });

  it('quadrillé 5 mm sur A4 : 41 verticales + 59 horizontales', () => {
    const m = motifFond('quadrille5', 210, 297);
    expect(m.lignes.filter(l => l.x1 === l.x2)).toHaveLength(41);
    expect(m.lignes.filter(l => l.y1 === l.y2)).toHaveLength(59);
  });

  it('quadrillé 1 cm sur A4 : 20 + 29', () => {
    expect(motifFond('quadrille10', 210, 297).lignes).toHaveLength(49);
  });

  it('Seyes : 148 horizontales dont 37 appuyées, marge rouge à 40 mm, 21 verticales', () => {
    const m = motifFond('seyes', 210, 297);
    const h = m.lignes.filter(l => l.y1 === l.y2);
    expect(h).toHaveLength(148);
    expect(h.filter(l => l.epaisseur === 0.25)).toHaveLength(37);
    const marge = m.lignes.filter(l => l.couleur === '#e05a5a');
    expect(marge).toHaveLength(1);
    expect(marge[0].x1).toBe(40);
    expect(m.lignes.filter(l => l.x1 === l.x2 && l.couleur !== '#e05a5a')).toHaveLength(21);
  });

  it('pointé 5 mm sur A4 : 41 × 59 points', () => {
    expect(motifFond('pointe', 210, 297).ronds).toHaveLength(41 * 59);
  });

  it('FONDS liste les choix avec libellé', () => {
    expect(FONDS.map(f => f.id)).toEqual(['aucun', 'quadrille5', 'quadrille10', 'seyes', 'pointe']);
  });
});
```

- [ ] **Step 2: Lancer, vérifier l'échec**

Run: `npx vitest run src/model/fonds.test.ts`
Expected: FAIL `Failed to resolve import "./fonds"`.

- [ ] **Step 3: Implémenter**

```ts
import type { Fond } from './types';

export type Ligne = { x1: number; y1: number; x2: number; y2: number; couleur: string; epaisseur: number };
export type Rond = { x: number; y: number; r: number; couleur: string };
export type Motif = { lignes: Ligne[]; ronds: Rond[] };

export const FONDS: { id: Fond; libelle: string }[] = [
  { id: 'aucun', libelle: 'Aucun' },
  { id: 'quadrille5', libelle: 'Quadrillé 5 mm' },
  { id: 'quadrille10', libelle: 'Quadrillé 1 cm' },
  { id: 'seyes', libelle: 'Seyes' },
  { id: 'pointe', libelle: 'Pointé' },
];

// Boucles sur des entiers k pour éviter les erreurs d'arrondi (0,1 + 0,2…).
function grille(l: number, h: number, pas: number, couleur: string, epaisseur: number): Ligne[] {
  const out: Ligne[] = [];
  for (let k = 1; k * pas < l; k++) out.push({ x1: k * pas, y1: 0, x2: k * pas, y2: h, couleur, epaisseur });
  for (let k = 1; k * pas < h; k++) out.push({ x1: 0, y1: k * pas, x2: l, y2: k * pas, couleur, epaisseur });
  return out;
}

function seyes(l: number, h: number): Ligne[] {
  const out: Ligne[] = [];
  for (let k = 1; k * 2 < h; k++) {
    const y = k * 2;
    const forte = k % 4 === 0;
    out.push({ x1: 0, y1: y, x2: l, y2: y, couleur: forte ? '#8fb3d9' : '#cfe0f0', epaisseur: forte ? 0.25 : 0.12 });
  }
  out.push({ x1: 40, y1: 0, x2: 40, y2: h, couleur: '#e05a5a', epaisseur: 0.3 });
  for (let k = 1; 40 + k * 8 < l; k++) out.push({ x1: 40 + k * 8, y1: 0, x2: 40 + k * 8, y2: h, couleur: '#8fb3d9', epaisseur: 0.2 });
  return out;
}

function pointe(l: number, h: number): Rond[] {
  const out: Rond[] = [];
  for (let i = 1; i * 5 < l; i++) for (let j = 1; j * 5 < h; j++) out.push({ x: i * 5, y: j * 5, r: 0.3, couleur: '#9aa5a8' });
  return out;
}

export function motifFond(fond: Fond, l: number, h: number): Motif {
  switch (fond) {
    case 'quadrille5': return { lignes: grille(l, h, 5, '#b8d4e8', 0.15), ronds: [] };
    case 'quadrille10': return { lignes: grille(l, h, 10, '#9cc2de', 0.2), ronds: [] };
    case 'seyes': return { lignes: seyes(l, h), ronds: [] };
    case 'pointe': return { lignes: [], ronds: pointe(l, h) };
    default: return { lignes: [], ronds: [] };
  }
}
```

- [ ] **Step 4: Lancer, vérifier le succès**

Run: `npx vitest run src/model/fonds.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/model/fonds.ts src/model/fonds.test.ts
git commit -m "feat: motifs de fond quadrillé, Seyes, pointé"
```

---

### Task 8: Règle de saisie (stylet / doigt / souris)

**Files:**
- Create: `src/input/pointerPolicy.ts`
- Test: `src/input/pointerPolicy.test.ts`

- [ ] **Step 1: Test qui échoue**

```ts
import { describe, it, expect } from 'vitest';
import { decider, ETAT_INITIAL } from './pointerPolicy';

describe('pointerPolicy', () => {
  it('mode souris : tout trace', () => {
    for (const t of ['mouse', 'pen', 'touch']) expect(decider('souris', ETAT_INITIAL, t).tracer).toBe(true);
  });

  it('mode stylet : le doigt trace tant qu’aucun stylet n’a été vu', () => {
    expect(decider('stylet', ETAT_INITIAL, 'touch').tracer).toBe(true);
  });

  it('mode stylet : après un stylet, le doigt ne trace plus', () => {
    const { etat } = decider('stylet', ETAT_INITIAL, 'pen');
    expect(etat.styletVu).toBe(true);
    expect(decider('stylet', etat, 'touch').tracer).toBe(false);
    expect(decider('stylet', etat, 'pen').tracer).toBe(true);
    expect(decider('stylet', etat, 'mouse').tracer).toBe(true);
  });

  it('ne modifie pas l’état d’entrée', () => {
    decider('stylet', ETAT_INITIAL, 'pen');
    expect(ETAT_INITIAL.styletVu).toBe(false);
  });
});
```

- [ ] **Step 2: Lancer, vérifier l'échec**

Run: `npx vitest run src/input/pointerPolicy.test.ts`
Expected: FAIL `Failed to resolve import "./pointerPolicy"`.

- [ ] **Step 3: Implémenter**

```ts
import type { ModeEntree } from '../model/types';

export type EtatStylet = { readonly styletVu: boolean };
export const ETAT_INITIAL: EtatStylet = Object.freeze({ styletVu: false });

/** Rejet de la paume : dès qu'un stylet a tracé, le doigt sert à naviguer, plus à écrire. */
export function decider(mode: ModeEntree, etat: EtatStylet, pointerType: string): { tracer: boolean; etat: EtatStylet } {
  if (mode === 'souris') return { tracer: true, etat };
  if (pointerType === 'pen') return { tracer: true, etat: etat.styletVu ? etat : { styletVu: true } };
  if (pointerType === 'touch') return { tracer: !etat.styletVu, etat };
  return { tracer: true, etat };
}
```

- [ ] **Step 4: Lancer, vérifier le succès**

Run: `npx vitest run src/input/pointerPolicy.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/input/pointerPolicy.ts src/input/pointerPolicy.test.ts
git commit -m "feat: règle de saisie stylet/doigt"
```

---

### Task 9: Outils par niveau et réglages

**Files:**
- Create: `src/model/outils.ts`, `src/lib/reglages.ts`
- Test: `src/model/outils.test.ts`, `src/lib/reglages.test.ts`

- [ ] **Step 1: Tests qui échouent**

`src/model/outils.test.ts` :

```ts
import { describe, it, expect } from 'vitest';
import { outilsPour, OUTILS } from './outils';

describe('outils', () => {
  it('P1-P2 : pas de gomme partielle ni de déplacement', () => {
    expect(outilsPour('p1p2').map(o => o.id)).toEqual(['main', 'stylo', 'gomme-objet', 'texte']);
  });
  it('P3-P6 et secondaire : tous les outils du socle', () => {
    expect(outilsPour('p3p6')).toHaveLength(OUTILS.length);
    expect(outilsPour('secondaire')).toHaveLength(OUTILS.length);
  });
  it('chaque outil a un libellé et une aide', () => {
    for (const o of OUTILS) {
      expect(o.libelle.length).toBeGreaterThan(0);
      expect(o.aide.length).toBeGreaterThan(0);
    }
  });
});
```

`src/lib/reglages.test.ts` :

```ts
import { describe, it, expect } from 'vitest';
import { lireReglages, ecrireReglages } from './reglages';

function memoire(): Storage {
  const m = new Map<string, string>();
  return {
    getItem: k => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: k => void m.delete(k),
    clear: () => m.clear(),
    key: i => Array.from(m.keys())[i] ?? null,
    get length() { return m.size; },
  };
}

describe('reglages', () => {
  it('rien d’enregistré → null', () => {
    expect(lireReglages(memoire())).toBeNull();
  });
  it('aller-retour', () => {
    const s = memoire();
    ecrireReglages({ niveau: 'secondaire', modeEntree: 'stylet' }, s);
    expect(lireReglages(s)).toEqual({ niveau: 'secondaire', modeEntree: 'stylet' });
  });
  it('valeur corrompue → null', () => {
    const s = memoire();
    s.setItem('cahieractif.reglages', '{"niveau":"lycee","modeEntree":"stylet"}');
    expect(lireReglages(s)).toBeNull();
    s.setItem('cahieractif.reglages', 'pas du json');
    expect(lireReglages(s)).toBeNull();
  });
  it('stockage indisponible → null sans exception', () => {
    expect(lireReglages(null)).toBeNull();
    expect(() => ecrireReglages({ niveau: 'p1p2', modeEntree: 'souris' }, null)).not.toThrow();
  });
});
```

- [ ] **Step 2: Lancer, vérifier l'échec**

Run: `npx vitest run src/model/outils.test.ts src/lib/reglages.test.ts`
Expected: FAIL (imports introuvables).

- [ ] **Step 3: Implémenter**

`src/model/outils.ts` :

```ts
import type { Niveau } from './types';

export type OutilId = 'main' | 'stylo' | 'gomme-objet' | 'gomme-partielle' | 'texte' | 'deplacer';
export type Outil = { id: OutilId; libelle: string; aide: string; niveaux: Niveau[] };

const TOUS: Niveau[] = ['p1p2', 'p3p6', 'secondaire'];

export const OUTILS: Outil[] = [
  { id: 'main', libelle: 'Main', aide: 'Faire défiler la page sans écrire', niveaux: TOUS },
  { id: 'stylo', libelle: 'Stylo', aide: 'Écrire ou dessiner à main levée', niveaux: TOUS },
  { id: 'gomme-objet', libelle: 'Gomme', aide: 'Toucher un trait ou un texte pour l’effacer en entier', niveaux: TOUS },
  { id: 'gomme-partielle', libelle: 'Gomme fine', aide: 'Effacer seulement une partie d’un trait', niveaux: ['p3p6', 'secondaire'] },
  { id: 'texte', libelle: 'Texte', aide: 'Toucher la page pour écrire au clavier', niveaux: TOUS },
  { id: 'deplacer', libelle: 'Déplacer', aide: 'Glisser un trait ou un texte à un autre endroit', niveaux: ['p3p6', 'secondaire'] },
];

export function outilsPour(n: Niveau): Outil[] {
  return OUTILS.filter(o => o.niveaux.includes(n));
}
```

`src/lib/reglages.ts` :

```ts
import type { ModeEntree, Niveau } from '../model/types';

export type Reglages = { niveau: Niveau; modeEntree: ModeEntree };

const CLE = 'cahieractif.reglages';
const NIVEAUX: Niveau[] = ['p1p2', 'p3p6', 'secondaire'];
const MODES: ModeEntree[] = ['souris', 'stylet'];

export function stockageLocal(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function lireReglages(s: Storage | null = stockageLocal()): Reglages | null {
  try {
    const brut = s?.getItem(CLE);
    if (!brut) return null;
    const r = JSON.parse(brut);
    if (!NIVEAUX.includes(r?.niveau) || !MODES.includes(r?.modeEntree)) return null;
    return { niveau: r.niveau, modeEntree: r.modeEntree };
  } catch {
    return null;
  }
}

export function ecrireReglages(r: Reglages, s: Storage | null = stockageLocal()): void {
  try {
    s?.setItem(CLE, JSON.stringify(r));
  } catch {
    // stockage plein ou bloqué : le réglage vaut pour la session seulement
  }
}
```

- [ ] **Step 4: Lancer, vérifier le succès**

Run: `npx vitest run src/model/outils.test.ts src/lib/reglages.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/model/outils.ts src/model/outils.test.ts src/lib/reglages.ts src/lib/reglages.test.ts
git commit -m "feat: outils filtrés par niveau, réglages locaux"
```

---

### Task 10: Stockage IndexedDB

**Files:**
- Create: `src/storage/adapter.ts`, `src/storage/indexeddb.ts`
- Test: `src/storage/indexeddb.test.ts`

- [ ] **Step 1: Test qui échoue**

```ts
import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { creerIndexedDBAdapter } from './indexeddb';
import { nouveauDocPdf, nouveauDocVierge } from '../model/ops';

let n = 0;
const base = () => `test-${n++}`;

describe('IndexedDBAdapter', () => {
  it('enregistre, charge, liste et supprime', async () => {
    const a = creerIndexedDBAdapter(base());
    const d = nouveauDocVierge('Fiche 1', 'p3p6');
    await a.enregistrer(d);
    expect(await a.charger(d.id)).toEqual(d);
    expect(await a.lister()).toEqual([{ id: d.id, titre: 'Fiche 1', modifie: d.modifie }]);
    await a.supprimer(d.id);
    expect(await a.charger(d.id)).toBeUndefined();
    expect(await a.lister()).toEqual([]);
  });

  it('conserve les octets du PDF', async () => {
    const a = creerIndexedDBAdapter(base());
    const octets = new Uint8Array([37, 80, 68, 70]).buffer;
    const d = nouveauDocPdf('PDF', 'secondaire', octets, [{ largeurMm: 210, hauteurMm: 297 }]);
    await a.enregistrer(d);
    const lu = await a.charger(d.id);
    expect(lu?.source.type).toBe('pdf');
    if (lu?.source.type === 'pdf') expect(new Uint8Array(lu.source.data)).toEqual(new Uint8Array([37, 80, 68, 70]));
  });

  it('liste du plus récent au plus ancien', async () => {
    const a = creerIndexedDBAdapter(base());
    const vieux = { ...nouveauDocVierge('Vieux', 'p3p6'), modifie: 1000 };
    const recent = { ...nouveauDocVierge('Récent', 'p3p6'), modifie: 2000 };
    await a.enregistrer(vieux);
    await a.enregistrer(recent);
    expect((await a.lister()).map(m => m.titre)).toEqual(['Récent', 'Vieux']);
  });
});
```

- [ ] **Step 2: Lancer, vérifier l'échec**

Run: `npx vitest run src/storage/indexeddb.test.ts`
Expected: FAIL `Failed to resolve import "./indexeddb"`.

- [ ] **Step 3: Implémenter**

`src/storage/adapter.ts` :

```ts
import type { CahierDoc } from '../model/types';

export type MetaDoc = { id: string; titre: string; modifie: number };

/** Seule porte vers le stockage : la v2 (HubActif) branchera ici un adaptateur serveur. */
export interface StorageAdapter {
  lister(): Promise<MetaDoc[]>;
  charger(id: string): Promise<CahierDoc | undefined>;
  enregistrer(doc: CahierDoc): Promise<void>;
  supprimer(id: string): Promise<void>;
}
```

`src/storage/indexeddb.ts` :

```ts
import { openDB } from 'idb';
import type { CahierDoc } from '../model/types';
import type { MetaDoc, StorageAdapter } from './adapter';

// Deux magasins : "meta" pour lister vite sans charger les PDF.
export function creerIndexedDBAdapter(nomBase = 'cahieractif'): StorageAdapter {
  const db = openDB(nomBase, 1, {
    upgrade(d) {
      d.createObjectStore('docs', { keyPath: 'id' });
      d.createObjectStore('meta', { keyPath: 'id' });
    },
  });

  return {
    async lister() {
      const metas: MetaDoc[] = await (await db).getAll('meta');
      return metas.sort((a, b) => b.modifie - a.modifie);
    },
    async charger(id) {
      return (await db).get('docs', id);
    },
    async enregistrer(doc: CahierDoc) {
      const tx = (await db).transaction(['docs', 'meta'], 'readwrite');
      await Promise.all([
        tx.objectStore('docs').put(doc),
        tx.objectStore('meta').put({ id: doc.id, titre: doc.titre, modifie: doc.modifie }),
        tx.done,
      ]);
    },
    async supprimer(id) {
      const tx = (await db).transaction(['docs', 'meta'], 'readwrite');
      await Promise.all([tx.objectStore('docs').delete(id), tx.objectStore('meta').delete(id), tx.done]);
    },
  };
}
```

- [ ] **Step 4: Lancer, vérifier le succès**

Run: `npx vitest run src/storage/indexeddb.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/storage
git commit -m "feat: stockage local IndexedDB derrière StorageAdapter"
```

---

### Task 11: Format de fichier `.cahier`

**Files:**
- Create: `src/fichier/cahier.ts`
- Test: `src/fichier/cahier.test.ts`

- [ ] **Step 1: Test qui échoue**

```ts
import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { versCahier, depuisCahier } from './cahier';
import { ajouterObjet, nouveauDocPdf, nouveauDocVierge } from '../model/ops';
import type { CahierDoc } from '../model/types';

describe('.cahier', () => {
  it('aller-retour d’un document PDF annoté (nouvel id, reste identique)', async () => {
    const octets = new Uint8Array([1, 2, 3, 4]).buffer;
    let d = nouveauDocPdf('Fiche', 'p3p6', octets, [{ largeurMm: 210, hauteurMm: 297 }]);
    d = ajouterObjet(d, 0, { id: 'a', type: 'texte', x: 1, y: 1, largeur: 50, texte: 'élève', taillePt: 14, couleur: '#000000' });
    const blob = await versCahier(d);
    const lu = await depuisCahier(await blob.arrayBuffer());
    expect(lu.id).not.toBe(d.id);
    expect({ ...lu, id: d.id, source: null }).toEqual({ ...d, source: null });
    expect(lu.source.type).toBe('pdf');
    if (lu.source.type === 'pdf') expect(new Uint8Array(lu.source.data)).toEqual(new Uint8Array([1, 2, 3, 4]));
  });

  it('aller-retour d’un document de photos', async () => {
    const d: CahierDoc = {
      ...nouveauDocVierge('Photo', 'p1p2'),
      source: { type: 'photos', images: [{ mime: 'image/jpeg', data: new Uint8Array([9, 9]).buffer }] },
    };
    const lu = await depuisCahier(await (await versCahier(d)).arrayBuffer());
    expect(lu.source.type).toBe('photos');
    if (lu.source.type === 'photos') {
      expect(lu.source.images[0].mime).toBe('image/jpeg');
      expect(new Uint8Array(lu.source.images[0].data)).toEqual(new Uint8Array([9, 9]));
    }
  });

  it('refuse un zip qui n’est pas un cahier', async () => {
    const z = new JSZip();
    z.file('autre.txt', 'x');
    const data = await z.generateAsync({ type: 'arraybuffer' });
    await expect(depuisCahier(data)).rejects.toThrow('Ce fichier n’est pas un fichier CahierActif.');
  });

  it('refuse une version plus récente', async () => {
    const z = new JSZip();
    z.file('manifeste.json', JSON.stringify({ format: 'cahieractif', version: 99 }));
    const data = await z.generateAsync({ type: 'arraybuffer' });
    await expect(depuisCahier(data)).rejects.toThrow('version plus récente');
  });

  it('refuse un fichier qui n’est pas un zip', async () => {
    await expect(depuisCahier(new Uint8Array([1, 2, 3]).buffer)).rejects.toThrow('Ce fichier n’est pas un fichier CahierActif.');
  });
});
```

- [ ] **Step 2: Lancer, vérifier l'échec**

Run: `npx vitest run src/fichier/cahier.test.ts`
Expected: FAIL `Failed to resolve import "./cahier"`.

- [ ] **Step 3: Implémenter**

```ts
import JSZip from 'jszip';
import { nouvelId } from '../model/types';
import type { CahierDoc, ImageSource, Source } from '../model/types';

const FORMAT = 'cahieractif';
const VERSION = 1;
const ERREUR_FORMAT = 'Ce fichier n’est pas un fichier CahierActif.';

type SourceDecrite = { type: 'pdf' } | { type: 'vierge' } | { type: 'photos'; mimes: ImageSource['mime'][] };

export async function versCahier(doc: CahierDoc): Promise<Blob> {
  const zip = new JSZip();
  let source: SourceDecrite;
  if (doc.source.type === 'pdf') {
    zip.file('source.pdf', doc.source.data);
    source = { type: 'pdf' };
  } else if (doc.source.type === 'photos') {
    doc.source.images.forEach((img, i) => zip.file(`images/${i}`, img.data));
    source = { type: 'photos', mimes: doc.source.images.map(i => i.mime) };
  } else {
    source = { type: 'vierge' };
  }
  zip.file('manifeste.json', JSON.stringify({ format: FORMAT, version: VERSION }));
  zip.file('document.json', JSON.stringify({ ...doc, source }));
  const octets = await zip.generateAsync({ type: 'uint8array' });
  return new Blob([octets], { type: 'application/zip' });
}

export async function depuisCahier(data: ArrayBuffer): Promise<CahierDoc> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(data);
  } catch {
    throw new Error(ERREUR_FORMAT);
  }
  const manifeste = await zip.file('manifeste.json')?.async('string');
  if (!manifeste) throw new Error(ERREUR_FORMAT);
  const m = JSON.parse(manifeste);
  if (m.format !== FORMAT) throw new Error(ERREUR_FORMAT);
  if (m.version > VERSION) throw new Error('Fichier créé par une version plus récente de CahierActif : mettez l’application à jour.');

  const brut = await zip.file('document.json')?.async('string');
  if (!brut) throw new Error(ERREUR_FORMAT);
  const doc = JSON.parse(brut) as Omit<CahierDoc, 'source'> & { source: SourceDecrite };

  let source: Source;
  if (doc.source.type === 'pdf') {
    const pdf = await zip.file('source.pdf')?.async('arraybuffer');
    if (!pdf) throw new Error(ERREUR_FORMAT);
    source = { type: 'pdf', data: pdf };
  } else if (doc.source.type === 'photos') {
    const images: ImageSource[] = [];
    for (let i = 0; i < doc.source.mimes.length; i++) {
      const img = await zip.file(`images/${i}`)?.async('arraybuffer');
      if (!img) throw new Error(ERREUR_FORMAT);
      images.push({ mime: doc.source.mimes[i], data: img });
    }
    source = { type: 'photos', images };
  } else {
    source = { type: 'vierge' };
  }
  // Nouvel id : réimporter ne doit jamais écraser un travail local plus récent.
  return { ...doc, id: nouvelId(), source };
}
```

- [ ] **Step 4: Lancer, vérifier le succès**

Run: `npx vitest run src/fichier/cahier.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/fichier
git commit -m "feat: format de fichier .cahier"
```

---

### Task 12: Lecture des tailles de pages PDF

**Files:**
- Create: `src/pdf/info.ts`
- Test: `src/pdf/info.test.ts`

- [ ] **Step 1: Test qui échoue**

```ts
import { describe, it, expect } from 'vitest';
import { PDFDocument, degrees } from 'pdf-lib';
import { taillesPagesPdf, PdfIllisibleError } from './info';

async function pdf(): Promise<ArrayBuffer> {
  const d = await PDFDocument.create();
  d.addPage([595.28, 841.89]);
  d.addPage([595.28, 841.89]).setRotation(degrees(90));
  const o = await d.save();
  return o.buffer.slice(o.byteOffset, o.byteOffset + o.byteLength) as ArrayBuffer;
}

describe('taillesPagesPdf', () => {
  it('renvoie la taille en mm, en tenant compte de la rotation', async () => {
    const t = await taillesPagesPdf(await pdf());
    expect(t).toHaveLength(2);
    expect(t[0].largeurMm).toBeCloseTo(210, 0);
    expect(t[0].hauteurMm).toBeCloseTo(297, 0);
    expect(t[1].largeurMm).toBeCloseTo(297, 0);
    expect(t[1].hauteurMm).toBeCloseTo(210, 0);
  });

  it('ne détache pas le tampon fourni', async () => {
    const data = await pdf();
    await taillesPagesPdf(data);
    expect(data.byteLength).toBeGreaterThan(0);
  });

  it('PDF abîmé → PdfIllisibleError avec message pour l’élève', async () => {
    await expect(taillesPagesPdf(new Uint8Array([1, 2, 3]).buffer)).rejects.toBeInstanceOf(PdfIllisibleError);
    await expect(taillesPagesPdf(new Uint8Array([1, 2, 3]).buffer)).rejects.toThrow('Ce PDF est protégé ou abîmé');
  });
});
```

- [ ] **Step 2: Lancer, vérifier l'échec**

Run: `npx vitest run src/pdf/info.test.ts`
Expected: FAIL `Failed to resolve import "./info"`.

- [ ] **Step 3: Implémenter**

```ts
import { PDFDocument } from 'pdf-lib';
import { ptVersMm } from '../lib/units';
import type { TaillePage } from '../model/types';

export class PdfIllisibleError extends Error {
  constructor() {
    super('Ce PDF est protégé ou abîmé : impossible de l’ouvrir. Demandez une autre version à votre enseignant.');
  }
}

export async function taillesPagesPdf(data: ArrayBuffer): Promise<TaillePage[]> {
  let pdf: PDFDocument;
  try {
    // pdf-lib refuse les PDF chiffrés (EncryptedPDFError) : même message que pour un PDF abîmé.
    pdf = await PDFDocument.load(data);
  } catch {
    throw new PdfIllisibleError();
  }
  return pdf.getPages().map(p => {
    const { width, height } = p.getSize();
    const r = ((p.getRotation().angle % 360) + 360) % 360;
    const [w, h] = r === 90 || r === 270 ? [height, width] : [width, height];
    return { largeurMm: ptVersMm(w), hauteurMm: ptVersMm(h) };
  });
}

export async function aDesPagesTournees(data: ArrayBuffer): Promise<boolean> {
  const pdf = await PDFDocument.load(data);
  return pdf.getPages().some(p => p.getRotation().angle % 360 !== 0);
}
```

- [ ] **Step 4: Lancer, vérifier le succès**

Run: `npx vitest run src/pdf/info.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/pdf/info.ts src/pdf/info.test.ts
git commit -m "feat: tailles des pages PDF, erreur lisible"
```

---

### Task 13: Export PDF annoté

**Files:**
- Create: `src/lib/couleurs.ts`, `src/pdf/export.ts`
- Test: `src/lib/couleurs.test.ts`, `src/pdf/export.test.ts`

- [ ] **Step 1: Tests qui échouent**

`src/lib/couleurs.test.ts` :

```ts
import { describe, it, expect } from 'vitest';
import { hexVersRgb01 } from './couleurs';

describe('hexVersRgb01', () => {
  it('convertit #rrggbb en composantes 0..1', () => {
    expect(hexVersRgb01('#ff8000')).toEqual({ r: 1, g: 128 / 255, b: 0 });
  });
  it('valeur invalide → noir', () => {
    expect(hexVersRgb01('rouge')).toEqual({ r: 0, g: 0, b: 0 });
  });
});
```

`src/pdf/export.test.ts` :

```ts
import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { exporterPdf } from './export';
import { ajouterObjet, ajouterPageVierge, changerFond, nouveauDocPdf, nouveauDocVierge } from '../model/ops';

async function texteDe(octets: Uint8Array, page: number): Promise<string> {
  const d = await pdfjs.getDocument({ data: octets.slice() }).promise;
  const c = await (await d.getPage(page)).getTextContent();
  return c.items.map(i => ('str' in i ? i.str : '')).join(' ');
}

async function source(): Promise<ArrayBuffer> {
  const d = await PDFDocument.create();
  d.addPage([595.28, 841.89]);
  const o = await d.save();
  return o.buffer.slice(o.byteOffset, o.byteOffset + o.byteLength) as ArrayBuffer;
}

describe('exporterPdf', () => {
  it('PDF source : garde le nombre de pages et écrit le texte de l’élève', async () => {
    let d = nouveauDocPdf('Fiche', 'p3p6', await source(), [{ largeurMm: 210, hauteurMm: 297 }]);
    d = ajouterObjet(d, 0, { id: 't', type: 'texte', x: 20, y: 30, largeur: 100, texte: 'Réponse élève ≤ 3', taillePt: 14, couleur: '#000000' });
    d = ajouterObjet(d, 0, { id: 's', type: 'trait', points: [{ x: 10, y: 10 }, { x: 50, y: 60 }], couleur: '#dc2626', epaisseur: 0.8 });
    const out = await exporterPdf(d);
    expect((await PDFDocument.load(out)).getPageCount()).toBe(1);
    expect(await texteDe(out, 1)).toContain('Réponse élève ? 3');
  });

  it('ne modifie pas les octets source du document', async () => {
    const src = await source();
    const avant = new Uint8Array(src).slice();
    await exporterPdf(nouveauDocPdf('F', 'p3p6', src, [{ largeurMm: 210, hauteurMm: 297 }]));
    expect(new Uint8Array(src)).toEqual(avant);
  });

  it('document vierge : une page A4 par page, fonds dessinés sans erreur', async () => {
    let d = ajouterPageVierge(nouveauDocVierge('V', 'p1p2'));
    d = changerFond(d, 0, 'seyes');
    d = changerFond(d, 1, 'pointe');
    d = ajouterObjet(d, 1, { id: 'p', type: 'trait', points: [{ x: 5, y: 5 }], couleur: '#000000', epaisseur: 1 });
    const pdf = await PDFDocument.load(await exporterPdf(d));
    expect(pdf.getPageCount()).toBe(2);
    expect(pdf.getPage(0).getWidth()).toBeCloseTo(595.28, 0);
  });
});
```

- [ ] **Step 2: Lancer, vérifier l'échec**

Run: `npx vitest run src/lib/couleurs.test.ts src/pdf/export.test.ts`
Expected: FAIL (imports introuvables).

- [ ] **Step 3: Implémenter**

`src/lib/couleurs.ts` :

```ts
export function hexVersRgb01(hex: string): { r: number; g: number; b: number } {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return { r: 0, g: 0, b: 0 };
  return { r: parseInt(m[1], 16) / 255, g: parseInt(m[2], 16) / 255, b: parseInt(m[3], 16) / 255 };
}
```

`src/pdf/export.ts` :

```ts
import { LineCapStyle, PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import { hexVersRgb01 } from '../lib/couleurs';
import { mmVersPt } from '../lib/units';
import { motifFond } from '../model/fonds';
import type { CahierDoc, Objet, Page } from '../model/types';

const K = mmVersPt(1); // pt par mm

const couleur = (hex: string) => {
  const c = hexVersRgb01(hex);
  return rgb(c.r, c.g, c.b);
};

/** Helvetica ne couvre que WinAnsi : tout caractère non encodable devient « ? ». */
function encodable(font: PDFFont, texte: string): string {
  return Array.from(texte)
    .map(ch => {
      if (ch === '\n') return ch;
      try {
        font.encodeText(ch);
        return ch;
      } catch {
        return '?';
      }
    })
    .join('');
}

function dessinerFond(p: PDFPage, page: Page) {
  const H = p.getHeight();
  const m = motifFond(page.fond, page.largeurMm, page.hauteurMm);
  for (const l of m.lignes) {
    p.drawLine({ start: { x: l.x1 * K, y: H - l.y1 * K }, end: { x: l.x2 * K, y: H - l.y2 * K }, thickness: l.epaisseur * K, color: couleur(l.couleur) });
  }
  for (const r of m.ronds) p.drawCircle({ x: r.x * K, y: H - r.y * K, size: r.r * K, color: couleur(r.couleur) });
}

function dessinerObjet(p: PDFPage, o: Objet, font: PDFFont) {
  const H = p.getHeight();
  if (o.type === 'trait') {
    if (o.points.length === 1) {
      p.drawCircle({ x: o.points[0].x * K, y: H - o.points[0].y * K, size: (o.epaisseur / 2) * K, color: couleur(o.couleur) });
      return;
    }
    // drawSvgPath : origine en (0, H), axe y vers le bas comme dans le modèle.
    const chemin = o.points.map((q, i) => `${i === 0 ? 'M' : 'L'} ${(q.x * K).toFixed(2)} ${(q.y * K).toFixed(2)}`).join(' ');
    p.drawSvgPath(chemin, { x: 0, y: H, borderColor: couleur(o.couleur), borderWidth: o.epaisseur * K, borderLineCap: LineCapStyle.Round });
    return;
  }
  if (!o.texte.trim()) return;
  // Ligne de base approximative : haut du cadre + demi-interligne + jambage supérieur.
  p.drawText(encodable(font, o.texte), {
    x: o.x * K,
    y: H - o.y * K - o.taillePt * 1.05,
    size: o.taillePt,
    font,
    lineHeight: o.taillePt * 1.5,
    maxWidth: o.largeur * K,
    color: couleur(o.couleur),
  });
}

// Source PDF : copie des octets (le document en mémoire reste intact). Sinon : pages créées, photo en fond.
async function preparer(doc: CahierDoc): Promise<PDFDocument> {
  if (doc.source.type === 'pdf') return PDFDocument.load(doc.source.data.slice(0));
  const out = await PDFDocument.create();
  for (let i = 0; i < doc.pages.length; i++) {
    const page = doc.pages[i];
    const p = out.addPage([page.largeurMm * K, page.hauteurMm * K]);
    const img = doc.source.type === 'photos' ? doc.source.images[i] : undefined;
    if (img) {
      const emb = img.mime === 'image/png' ? await out.embedPng(img.data) : await out.embedJpg(img.data);
      p.drawImage(emb, { x: 0, y: 0, width: p.getWidth(), height: p.getHeight() });
    }
  }
  return out;
}

export async function exporterPdf(doc: CahierDoc): Promise<Uint8Array> {
  const out = await preparer(doc);
  out.setTitle(doc.titre);
  out.setCreator('CahierActif (PLAI)');
  const font = await out.embedFont(StandardFonts.Helvetica);
  doc.pages.forEach((page, i) => {
    const p = out.getPage(i);
    dessinerFond(p, page);
    for (const o of page.objets) dessinerObjet(p, o, font);
  });
  return out.save();
}
```

- [ ] **Step 4: Lancer, vérifier le succès**

Run: `npx vitest run src/lib/couleurs.test.ts src/pdf/export.test.ts`
Expected: PASS (5 tests). Un avertissement pdf.js `Setting up fake worker` est normal sous Node.

- [ ] **Step 5: Commit**

```bash
git add src/lib/couleurs.ts src/lib/couleurs.test.ts src/pdf/export.ts src/pdf/export.test.ts
git commit -m "feat: export PDF annoté (pdf-lib)"
```

---

### Task 14: Partage / téléchargement et ouverture pdf.js

**Files:**
- Create: `src/lib/partage.ts`, `src/pdf/pdfjs.ts`
- Test: `src/lib/partage.test.ts`

- [ ] **Step 1: Test qui échoue**

```ts
import { describe, it, expect } from 'vitest';
import { nomFichier } from './partage';

describe('nomFichier', () => {
  it('retire les caractères interdits et garde les accents', () => {
    expect(nomFichier('Fiche : géométrie / ex. 3?')).toBe('Fiche - géométrie - ex. 3');
  });
  it('titre vide → cahier', () => {
    expect(nomFichier('  ')).toBe('cahier');
  });
  it('tronque à 80 caractères', () => {
    expect(nomFichier('a'.repeat(200))).toHaveLength(80);
  });
});
```

- [ ] **Step 2: Lancer, vérifier l'échec**

Run: `npx vitest run src/lib/partage.test.ts`
Expected: FAIL `Failed to resolve import "./partage"`.

- [ ] **Step 3: Implémenter**

`src/lib/partage.ts` :

```ts
export function nomFichier(titre: string): string {
  const propre = titre
    .replace(/[\\/:*?"<>|]+/g, ' - ')
    .replace(/\s+/g, ' ')
    .replace(/(\s-\s)+/g, ' - ')
    .replace(/[\s-]+$/g, '')
    .trim()
    .slice(0, 80);
  return propre || 'cahier';
}

/** Feuille de partage de la tablette si disponible (Teams, Smartschool, mail…), sinon téléchargement. */
export async function partagerOuTelecharger(blob: Blob, nom: string): Promise<void> {
  const fichier = new File([blob], nom, { type: blob.type });
  if (navigator.canShare?.({ files: [fichier] })) {
    try {
      await navigator.share({ files: [fichier], title: nom });
      return;
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return; // l'élève a fermé la feuille de partage
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nom;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
```

`src/pdf/pdfjs.ts` :

```ts
import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export type { PDFDocumentProxy } from 'pdfjs-dist';

export function ouvrirPdf(data: ArrayBuffer) {
  // Copie : pdf.js transfère (détache) le tampon vers son worker.
  return pdfjs.getDocument({ data: new Uint8Array(data.slice(0)) }).promise;
}
```

- [ ] **Step 4: Lancer, vérifier le succès**

Run: `npx vitest run src/lib/partage.test.ts && npx tsc --noEmit`
Expected: PASS (3 tests), `tsc` sans erreur.

- [ ] **Step 5: Commit**

```bash
git add src/lib/partage.ts src/lib/partage.test.ts src/pdf/pdfjs.ts
git commit -m "feat: partage/téléchargement, ouverture pdf.js"
```

---

### Task 15: Interface — page, éditeur, bibliothèque, réglages

Composants visuels : pas de test unitaire, vérification dans le navigateur (étape 8).

**Files:**
- Create: `src/ui/PdfCanvas.tsx`, `src/ui/EditeurTexte.tsx`, `src/ui/PageVue.tsx`, `src/ui/BarreOutils.tsx`, `src/ui/Editeur.tsx`, `src/ui/Bibliotheque.tsx`, `src/ui/Reglages.tsx`, `src/ui/BanniereInstallation.tsx`
- Modify: `src/App.tsx` (remplacement complet)

- [ ] **Step 1: `src/ui/PdfCanvas.tsx`**

```tsx
import { useEffect, useRef } from 'react';
import type { PDFDocumentProxy } from '../pdf/pdfjs';
import { MM_PAR_PT } from '../lib/units';

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
      const dpr = window.devicePixelRatio || 1;
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
```

- [ ] **Step 2: `src/ui/EditeurTexte.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react';
import { ptVersMm } from '../lib/units';
import type { Texte } from '../model/types';

type Props = { texte: Texte; pxMm: number; onFin: (valeur: string) => void };

/** Zone de saisie HTML posée exactement sur la zone de texte Konva. */
export function EditeurTexte({ texte, pxMm, onFin }: Props) {
  const [valeur, setValeur] = useState(texte.texte);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => ref.current?.focus(), []);
  const taillePx = ptVersMm(texte.taillePt) * pxMm;

  return (
    <textarea
      ref={ref}
      value={valeur}
      aria-label="Zone de texte"
      onChange={e => setValeur(e.target.value)}
      onBlur={() => onFin(valeur)}
      onKeyDown={e => { if (e.key === 'Escape') ref.current?.blur(); }}
      rows={Math.max(1, valeur.split('\n').length)}
      style={{
        position: 'absolute',
        left: texte.x * pxMm,
        top: texte.y * pxMm,
        width: texte.largeur * pxMm,
        fontFamily: 'Arial, sans-serif',
        fontSize: taillePx,
        lineHeight: 1.5,
        color: texte.couleur,
        background: 'rgba(255,255,255,0.9)',
        border: '2px solid #0f6e56',
        padding: 0,
        resize: 'none',
        overflow: 'hidden',
        zIndex: 10,
      }}
    />
  );
}
```

- [ ] **Step 3: `src/ui/PageVue.tsx`**

```tsx
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
```

- [ ] **Step 4: `src/ui/BarreOutils.tsx`**

```tsx
import type { Fond, Niveau } from '../model/types';
import { FONDS } from '../model/fonds';
import { outilsPour, type OutilId } from '../model/outils';

export const COULEURS = ['#1a1814', '#1d4ed8', '#dc2626', '#15803d', '#f97316', '#7c3aed'];
export const EPAISSEURS = [
  { mm: 0.4, libelle: 'Fin' },
  { mm: 0.8, libelle: 'Moyen' },
  { mm: 1.6, libelle: 'Épais' },
];

type Props = {
  niveau: Niveau;
  outil: OutilId;
  setOutil: (o: OutilId) => void;
  couleur: string;
  setCouleur: (c: string) => void;
  epaisseur: number;
  setEpaisseur: (e: number) => void;
  fond: Fond;
  setFond: (f: Fond) => void;
  peutAnnuler: boolean;
  peutRetablir: boolean;
  onAnnuler: () => void;
  onRetablir: () => void;
  zoom: number;
  setZoom: (z: number) => void;
};

export function BarreOutils(p: Props) {
  const grand = p.niveau === 'p1p2';
  const bouton = (actif: boolean) =>
    `plai-btn ${grand ? 'min-h-[64px] min-w-[64px] text-lg' : 'min-h-[44px] min-w-[44px]'} ${actif ? 'ring-4 ring-[#0f6e56]' : ''}`;

  return (
    <div className="sticky top-[52px] z-50 flex flex-wrap items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] p-2" role="toolbar" aria-label="Outils">
      {outilsPour(p.niveau).map(o => (
        <button key={o.id} type="button" className={bouton(p.outil === o.id)} title={o.aide} aria-pressed={p.outil === o.id} onClick={() => p.setOutil(o.id)}>
          {o.libelle}
        </button>
      ))}
      <span className="mx-2 h-8 w-px bg-[var(--border)]" aria-hidden />
      {COULEURS.map(c => (
        <button key={c} type="button" aria-label={`Couleur ${c}`} aria-pressed={p.couleur === c} onClick={() => p.setCouleur(c)}
          className={`h-11 w-11 rounded-full border-2 ${p.couleur === c ? 'border-[#0f6e56] ring-2 ring-[#0f6e56]' : 'border-white'}`}
          style={{ background: c }} />
      ))}
      <span className="mx-2 h-8 w-px bg-[var(--border)]" aria-hidden />
      {EPAISSEURS.map(e => (
        <button key={e.mm} type="button" className={bouton(p.epaisseur === e.mm)} aria-pressed={p.epaisseur === e.mm} onClick={() => p.setEpaisseur(e.mm)}>
          {e.libelle}
        </button>
      ))}
      <span className="mx-2 h-8 w-px bg-[var(--border)]" aria-hidden />
      <button type="button" className={bouton(false)} disabled={!p.peutAnnuler} onClick={p.onAnnuler}>Annuler</button>
      <button type="button" className={bouton(false)} disabled={!p.peutRetablir} onClick={p.onRetablir}>Rétablir</button>
      <span className="mx-2 h-8 w-px bg-[var(--border)]" aria-hidden />
      <button type="button" className={bouton(false)} aria-label="Dézoomer" onClick={() => p.setZoom(Math.max(0.5, +(p.zoom - 0.25).toFixed(2)))}>−</button>
      <span className="min-w-[3.5rem] text-center" aria-live="polite">{Math.round(p.zoom * 100)} %</span>
      <button type="button" className={bouton(false)} aria-label="Zoomer" onClick={() => p.setZoom(Math.min(3, +(p.zoom + 0.25).toFixed(2)))}>+</button>
      <label className="ml-2 flex items-center gap-2">
        Fond de la page
        <select className="plai-input min-h-[44px]" value={p.fond} onChange={e => p.setFond(e.target.value as Fond)}>
          {FONDS.map(f => <option key={f.id} value={f.id}>{f.libelle}</option>)}
        </select>
      </label>
    </div>
  );
}
```

- [ ] **Step 5: `src/ui/Editeur.tsx`**

```tsx
import { useEffect, useReducer, useRef, useState } from 'react';
import { ETAT_INITIAL, type EtatStylet } from '../input/pointerPolicy';
import { nomFichier, partagerOuTelecharger } from '../lib/partage';
import { pxParMm } from '../lib/units';
import type { Reglages } from '../lib/reglages';
import { versCahier } from '../fichier/cahier';
import { annuler, creer, peutAnnuler, peutRetablir, pousser, retablir, type Historique } from '../model/history';
import { ajouterPageVierge, changerFond } from '../model/ops';
import type { OutilId } from '../model/outils';
import type { CahierDoc } from '../model/types';
import { aDesPagesTournees } from '../pdf/info';
import { exporterPdf } from '../pdf/export';
import { ouvrirPdf, type PDFDocumentProxy } from '../pdf/pdfjs';
import type { StorageAdapter } from '../storage/adapter';
import { BarreOutils, COULEURS, EPAISSEURS } from './BarreOutils';
import { PageVue } from './PageVue';

type Action = { type: 'commit'; doc: CahierDoc } | { type: 'annuler' } | { type: 'retablir' };

function reducteur(h: Historique<CahierDoc>, a: Action): Historique<CahierDoc> {
  if (a.type === 'commit') return pousser(h, a.doc);
  return a.type === 'annuler' ? annuler(h) : retablir(h);
}

type Props = { initial: CahierDoc; reglages: Reglages; stockage: StorageAdapter; onFermer: () => void };

export function Editeur({ initial, reglages, stockage, onFermer }: Props) {
  const [h, dispatch] = useReducer(reducteur, initial, creer);
  const doc = h.present;
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [outil, setOutil] = useState<OutilId>('stylo');
  const [couleur, setCouleur] = useState(COULEURS[0]);
  const [epaisseur, setEpaisseur] = useState(EPAISSEURS[1].mm);
  const [zoom, setZoom] = useState(1);
  const [pageActive, setPageActive] = useState(0);
  const [etatStylet, setEtatStylet] = useState<EtatStylet>(ETAT_INITIAL);
  const [message, setMessage] = useState<{ type: 'erreur' | 'info'; texte: string } | null>(null);

  useEffect(() => {
    if (initial.source.type !== 'pdf') return;
    let vivant = true;
    ouvrirPdf(initial.source.data)
      .then(d => vivant && setPdf(d))
      .catch(() => setMessage({ type: 'erreur', texte: 'Impossible d’afficher ce PDF.' }));
    return () => { vivant = false; };
  }, [initial]);

  // Sauvegarde automatique, 800 ms après la dernière modification.
  const dernier = useRef(doc);
  dernier.current = doc;
  useEffect(() => {
    if (doc === initial) return;
    const t = setTimeout(() => {
      stockage.enregistrer(doc).catch(() =>
        setMessage({ type: 'erreur', texte: 'Sauvegarde impossible (stockage plein ?). Exportez votre travail en fichier .cahier.' }),
      );
    }, 800);
    return () => clearTimeout(t);
  }, [doc, initial, stockage]);
  useEffect(() => () => { void stockage.enregistrer(dernier.current); }, [stockage]);

  const commit = (d: CahierDoc) => dispatch({ type: 'commit', doc: d });

  const exporter = async () => {
    try {
      if (doc.source.type === 'pdf' && (await aDesPagesTournees(doc.source.data))) {
        setMessage({ type: 'info', texte: 'Attention : ce PDF contient des pages tournées, les annotations peuvent être décalées dans l’export.' });
      }
      const octets = await exporterPdf(doc);
      await partagerOuTelecharger(new Blob([octets], { type: 'application/pdf' }), `${nomFichier(doc.titre)}.pdf`);
    } catch {
      setMessage({ type: 'erreur', texte: 'L’export PDF a échoué. Votre travail est conservé : réessayez.' });
    }
  };

  const exporterCahier = async () => {
    try {
      await partagerOuTelecharger(await versCahier(doc), `${nomFichier(doc.titre)}.cahier`);
    } catch {
      setMessage({ type: 'erreur', texte: 'L’enregistrement du fichier .cahier a échoué. Réessayez.' });
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 p-2">
        <button type="button" className="plai-btn min-h-[44px]" onClick={onFermer}>Retour à mes documents</button>
        <h1 className="font-serif text-xl">{doc.titre}</h1>
        <span className="flex-1" />
        <button type="button" className="plai-btn min-h-[44px]" onClick={exporter}>Exporter en PDF</button>
        <button type="button" className="plai-btn min-h-[44px]" onClick={exporterCahier}>Enregistrer un fichier .cahier</button>
        {doc.source.type === 'vierge' && (
          <button type="button" className="plai-btn min-h-[44px]" onClick={() => commit(ajouterPageVierge(doc))}>Ajouter une page</button>
        )}
      </div>
      {message && (
        <div className={message.type === 'erreur' ? 'plai-error' : 'plai-banner'} role="alert">
          {message.texte} <button type="button" className="underline" onClick={() => setMessage(null)}>Fermer</button>
        </div>
      )}
      <BarreOutils
        niveau={reglages.niveau}
        outil={outil} setOutil={setOutil}
        couleur={couleur} setCouleur={setCouleur}
        epaisseur={epaisseur} setEpaisseur={setEpaisseur}
        fond={doc.pages[pageActive]?.fond ?? 'aucun'}
        setFond={f => commit(changerFond(doc, pageActive, f))}
        peutAnnuler={peutAnnuler(h)} peutRetablir={peutRetablir(h)}
        onAnnuler={() => dispatch({ type: 'annuler' })} onRetablir={() => dispatch({ type: 'retablir' })}
        zoom={zoom} setZoom={setZoom}
      />
      <div className="overflow-auto bg-[var(--surface2)] py-2">
        {doc.pages.map((_, i) => (
          <PageVue
            key={i}
            doc={doc}
            pageIndex={i}
            pxMm={pxParMm(zoom)}
            outil={outil}
            couleur={couleur}
            epaisseur={epaisseur}
            mode={reglages.modeEntree}
            etatStylet={etatStylet}
            setEtatStylet={setEtatStylet}
            pdf={pdf}
            onCommit={commit}
            onActive={() => setPageActive(i)}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: `src/ui/Bibliotheque.tsx`, `src/ui/Reglages.tsx`, `src/ui/BanniereInstallation.tsx`**

`src/ui/Bibliotheque.tsx` :

```tsx
import { useEffect, useRef, useState } from 'react';
import { depuisCahier } from '../fichier/cahier';
import type { Reglages } from '../lib/reglages';
import { nouveauDocPdf, nouveauDocVierge } from '../model/ops';
import type { CahierDoc } from '../model/types';
import { taillesPagesPdf, PdfIllisibleError } from '../pdf/info';
import type { MetaDoc, StorageAdapter } from '../storage/adapter';

type Props = { stockage: StorageAdapter; reglages: Reglages; onOuvrir: (d: CahierDoc) => void };

export function Bibliotheque({ stockage, reglages, onOuvrir }: Props) {
  const [docs, setDocs] = useState<MetaDoc[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const pdfInput = useRef<HTMLInputElement>(null);
  const cahierInput = useRef<HTMLInputElement>(null);

  const rafraichir = () => stockage.lister().then(setDocs).catch(() => setErreur('Lecture des documents impossible sur cet appareil.'));
  useEffect(() => { void rafraichir(); }, []);

  const creerEtOuvrir = async (d: CahierDoc) => {
    await stockage.enregistrer(d);
    onOuvrir(d);
  };

  const ouvrirPdf = async (f: File) => {
    setErreur(null);
    try {
      const data = await f.arrayBuffer();
      const tailles = await taillesPagesPdf(data);
      await creerEtOuvrir(nouveauDocPdf(f.name.replace(/\.pdf$/i, ''), reglages.niveau, data, tailles));
    } catch (e) {
      setErreur(e instanceof PdfIllisibleError ? e.message : 'Ce fichier ne peut pas être ouvert.');
    }
  };

  const importerCahier = async (f: File) => {
    setErreur(null);
    try {
      await creerEtOuvrir(await depuisCahier(await f.arrayBuffer()));
    } catch (e) {
      setErreur((e as Error).message);
    }
  };

  const ouvrirExistant = async (id: string) => {
    const d = await stockage.charger(id);
    if (d) onOuvrir(d);
    else setErreur('Document introuvable.');
  };

  const supprimer = async (m: MetaDoc) => {
    if (!window.confirm(`Supprimer définitivement « ${m.titre} » de cet appareil ?`)) return;
    await stockage.supprimer(m.id);
    await rafraichir();
  };

  return (
    <section className="plai-section mx-auto max-w-3xl p-4">
      <h1 className="mb-4 font-serif text-3xl">Mes documents</h1>
      <div className="mb-2 flex flex-wrap gap-2">
        <button type="button" className="plai-btn min-h-[44px]" onClick={() => pdfInput.current?.click()}>Ouvrir un PDF</button>
        <button type="button" className="plai-btn min-h-[44px]" onClick={() => creerEtOuvrir(nouveauDocVierge('Page vierge', reglages.niveau))}>Nouvelle page vierge</button>
        <button type="button" className="plai-btn min-h-[44px]" onClick={() => cahierInput.current?.click()}>Reprendre un fichier .cahier</button>
      </div>
      <p className="mb-4 text-[var(--text2)]">
        Ouvrir un PDF : la fiche reçue de l’enseignant (Teams, Smartschool, mail). Fichier .cahier : un travail commencé sur un autre appareil.
        Tout reste sur cet appareil, rien n’est envoyé sur internet.
      </p>
      <input ref={pdfInput} type="file" accept="application/pdf" hidden onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void ouvrirPdf(f); }} />
      <input ref={cahierInput} type="file" accept=".cahier,application/zip" hidden onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void importerCahier(f); }} />
      {erreur && <div className="plai-error mb-4" role="alert">{erreur}</div>}
      {docs.length === 0 ? (
        <div className="plai-empty">Aucun document pour l’instant.</div>
      ) : (
        <ul className="space-y-2">
          {docs.map(m => (
            <li key={m.id} className="plai-card flex items-center gap-2 p-3">
              <button type="button" className="flex-1 text-left text-lg" onClick={() => ouvrirExistant(m.id)}>
                {m.titre}
                <span className="block text-sm text-[var(--text3)]">Modifié le {new Date(m.modifie).toLocaleString('fr-BE')}</span>
              </button>
              <button type="button" className="plai-btn min-h-[44px]" onClick={() => supprimer(m)}>Supprimer</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

`src/ui/Reglages.tsx` :

```tsx
import { useState } from 'react';
import type { Reglages as R } from '../lib/reglages';
import type { ModeEntree, Niveau } from '../model/types';

const NIVEAUX: { id: Niveau; libelle: string; aide: string }[] = [
  { id: 'p1p2', libelle: 'P1-P2', aide: 'Grands boutons, peu d’outils : stylo, gomme, texte.' },
  { id: 'p3p6', libelle: 'P3-P6', aide: 'Tous les outils du fondamental, dont la gomme fine et le déplacement.' },
  { id: 'secondaire', libelle: 'Secondaire (S1-S6)', aide: 'Tous les outils, y compris ceux réservés au secondaire dans les prochaines versions.' },
];

const MODES: { id: ModeEntree; libelle: string; aide: string }[] = [
  { id: 'stylet', libelle: 'Tablette avec stylet', aide: 'Dès que le stylet touche l’écran, le doigt ne trace plus : il sert à faire défiler. La paume posée n’écrit pas.' },
  { id: 'souris', libelle: 'Ordinateur ou tablette au doigt', aide: 'La souris, le pavé tactile et le doigt tracent tous. Utilisez l’outil Main pour faire défiler.' },
];

type Props = { initial: R | null; onValider: (r: R) => void };

export function Reglages({ initial, onValider }: Props) {
  const [niveau, setNiveau] = useState<Niveau>(initial?.niveau ?? 'p3p6');
  const [mode, setMode] = useState<ModeEntree>(initial?.modeEntree ?? 'stylet');

  return (
    <section className="plai-section mx-auto max-w-2xl p-4">
      <h1 className="mb-4 font-serif text-3xl">Réglages</h1>
      <fieldset className="plai-card mb-4 p-4">
        <legend className="font-semibold">Niveau de l’élève</legend>
        <p className="mb-2 text-[var(--text2)]">Le niveau décide des outils affichés. Moins d’outils = moins de distraction pour les plus jeunes.</p>
        {NIVEAUX.map(n => (
          <label key={n.id} className="mb-2 flex items-start gap-3">
            <input type="radio" name="niveau" className="mt-2 h-5 w-5" checked={niveau === n.id} onChange={() => setNiveau(n.id)} />
            <span><strong>{n.libelle}</strong><span className="block text-[var(--text2)]">{n.aide}</span></span>
          </label>
        ))}
      </fieldset>
      <fieldset className="plai-card mb-4 p-4">
        <legend className="font-semibold">Appareil utilisé</legend>
        <p className="mb-2 text-[var(--text2)]">Ce réglage décide de ce que fait le doigt sur l’écran.</p>
        {MODES.map(m => (
          <label key={m.id} className="mb-2 flex items-start gap-3">
            <input type="radio" name="mode" className="mt-2 h-5 w-5" checked={mode === m.id} onChange={() => setMode(m.id)} />
            <span><strong>{m.libelle}</strong><span className="block text-[var(--text2)]">{m.aide}</span></span>
          </label>
        ))}
      </fieldset>
      <button type="button" className="plai-btn min-h-[44px]" onClick={() => onValider({ niveau, modeEntree: mode })}>Valider</button>
    </section>
  );
}
```

`src/ui/BanniereInstallation.tsx` :

```tsx
function estIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function estInstallee(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
}

/** Safari peut effacer les données d'un site non installé après 7 jours sans visite. */
export function BanniereInstallation() {
  if (!estIOS() || estInstallee()) return null;
  return (
    <div className="plai-banner" role="note">
      Sur iPad : touchez Partager puis « Sur l’écran d’accueil » pour installer CahierActif. Sinon, l’iPad peut effacer vos documents après quelques jours sans utilisation.
    </div>
  );
}
```

- [ ] **Step 7: `src/App.tsx` (remplacement complet)**

```tsx
import { useEffect, useMemo, useState } from 'react';
import { ecrireReglages, lireReglages, type Reglages as R } from './lib/reglages';
import type { CahierDoc } from './model/types';
import { creerIndexedDBAdapter } from './storage/indexeddb';
import { BanniereInstallation } from './ui/BanniereInstallation';
import { Bibliotheque } from './ui/Bibliotheque';
import { Editeur } from './ui/Editeur';
import { Reglages } from './ui/Reglages';

type Ecran = { nom: 'bibliotheque' } | { nom: 'reglages' } | { nom: 'document'; doc: CahierDoc };

export default function App() {
  const stockage = useMemo(() => creerIndexedDBAdapter(), []);
  const [reglages, setReglages] = useState<R | null>(() => lireReglages());
  const [ecran, setEcran] = useState<Ecran>(reglages ? { nom: 'bibliotheque' } : { nom: 'reglages' });

  // Demande au navigateur de ne pas effacer les données (accordé si l'app est installée).
  useEffect(() => { void navigator.storage?.persist?.(); }, []);

  const valider = (r: R) => {
    ecrireReglages(r);
    setReglages(r);
    setEcran({ nom: 'bibliotheque' });
  };

  return (
    <>
      <nav className="plai-nav">
        <button type="button" className="plai-nav-logo" onClick={() => reglages && setEcran({ nom: 'bibliotheque' })}>
          <img src="/plai-logo.jpg" alt="PLAI" style={{ height: 32, width: 'auto' }} />
          CahierActif
        </button>
        <div className="plai-nav-actions">
          {reglages && ecran.nom !== 'document' && (
            <button type="button" className="plai-nav-link min-h-[44px]" onClick={() => setEcran({ nom: 'reglages' })}>Réglages</button>
          )}
        </div>
      </nav>
      <BanniereInstallation />
      <main>
        {ecran.nom === 'reglages' || !reglages ? (
          <Reglages initial={reglages} onValider={valider} />
        ) : ecran.nom === 'document' ? (
          <Editeur key={ecran.doc.id} initial={ecran.doc} reglages={reglages} stockage={stockage} onFermer={() => setEcran({ nom: 'bibliotheque' })} />
        ) : (
          <Bibliotheque stockage={stockage} reglages={reglages} onOuvrir={doc => setEcran({ nom: 'document', doc })} />
        )}
      </main>
      <footer className="plai-footer">
        <img src="/plai-logo.jpg" alt="PLAI" style={{ height: 40, width: 'auto' }} />
        <span>CahierActif · PLAI · Pôle Territorial de la Ville de Liège</span>
      </footer>
    </>
  );
}
```

- [ ] **Step 8: Vérification navigateur**

Run: `npx tsc --noEmit && npx vitest run` → tout passe. Puis lancer le serveur de dev via l'outil d'aperçu (`.claude/launch.json` : `{"name":"cahieractif","runtimeExecutable":"npx","runtimeArgs":["vite"],"port":5173}`) et vérifier, à la souris, dans l'ordre :

1. Premier lancement → écran Réglages ; valider P3-P6 + « Ordinateur » → « Mes documents ».
2. « Nouvelle page vierge » → page A4 ; tracer au stylo ; Annuler / Rétablir.
3. Fond « Seyes » → lignes visibles, marge rouge à gauche.
4. Outil Texte → clic sur la page → taper « Réponse : 12 cm » → cliquer ailleurs → texte affiché ; recliquer dessus avec l'outil Texte → modifiable.
5. Gomme fine au milieu d'un trait → trait coupé en deux ; Annuler → trait entier (un seul Annuler pour tout le geste).
6. Gomme → toucher le texte → disparaît.
7. Déplacer → glisser un trait → déplacé ; recharger la page → le document de la liste contient le travail (autosave).
8. « Ouvrir un PDF » avec un PDF de fiche réel → affiché net ; annoter ; « Exporter en PDF » → fichier téléchargé, ouvert dans un lecteur PDF : annotations au bon endroit (tolérance texte ± 1 mm verticalement).
9. « Enregistrer un fichier .cahier » → « Retour » → « Reprendre un fichier .cahier » → document identique (nouveau dans la liste).
10. Réglages → P1-P2 → ouvrir un document : seulement Main, Stylo, Gomme, Texte, en grands boutons.
11. Console : aucune erreur.

Capture d'écran de l'étape 8 jointe au compte rendu.

- [ ] **Step 9: Commit**

```bash
git add src/ui src/App.tsx
git commit -m "feat: interface bibliothèque, réglages, éditeur, page annotable"
```

---

### Task 16: PWA installable hors ligne

**Files:**
- Create: `scripts/icones.mjs`
- Modify: `vite.config.ts`

- [ ] **Step 1: Générer les icônes**

`scripts/icones.mjs` :

```js
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const pub = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const svg = (t) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${t}" height="${t}" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#0f6e56"/>
  <rect x="128" y="104" width="256" height="304" rx="16" fill="#faf9f7"/>
  <path d="M168 176h176M168 232h176M168 288h120" stroke="#9cc2de" stroke-width="10" stroke-linecap="round"/>
  <path d="M300 360 L392 196" stroke="#f97316" stroke-width="28" stroke-linecap="round"/>
</svg>`);

for (const [nom, t] of [['icone-192.png', 192], ['icone-512.png', 512], ['apple-touch-icon.png', 180]]) {
  await sharp(svg(t)).png().toFile(join(pub, nom));
  console.log('écrit', nom);
}
```

Run: `npm run icones`
Expected: `écrit icone-192.png`, `écrit icone-512.png`, `écrit apple-touch-icon.png`.

- [ ] **Step 2: Configurer vite-plugin-pwa**

`vite.config.ts` :

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['plai-logo.jpg', 'apple-touch-icon.png'],
      manifest: {
        name: 'CahierActif',
        short_name: 'CahierActif',
        description: 'Annoter un PDF ou une photo de feuille comme sur un cahier',
        lang: 'fr',
        start_url: '/',
        display: 'standalone',
        theme_color: '#0f6e56',
        background_color: '#faf9f7',
        icons: [
          { src: 'icone-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icone-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,mjs,css,html,png,jpg,svg,woff2}'],
        globIgnores: ['spike-gestes.html'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // worker pdf.js ≈ 1 Mo
      },
    }),
  ],
  test: { include: ['src/**/*.test.ts'] },
});
```

- [ ] **Step 3: Build et vérification hors ligne**

Run: `npx vite build && npx vite preview --port 4173`
Expected: build OK, `dist/sw.js` et `dist/manifest.webmanifest` présents.

Dans le navigateur d'aperçu, ouvrir `http://localhost:4173`, recharger une fois (installation du service worker), puis vérifier via `javascript_tool` : `navigator.serviceWorker.controller !== null` → `true`. Couper le serveur `preview`, recharger : l'app s'affiche toujours.

- [ ] **Step 4: Commit**

```bash
git add scripts/icones.mjs public/icone-192.png public/icone-512.png public/apple-touch-icon.png vite.config.ts
git commit -m "feat: PWA installable hors ligne"
```

---

### Task 17: Déploiement et recette sur matériel

- [ ] **Step 1: Build check obligatoire**

Run: `npx tsc --noEmit && npx vitest run && npx vite build`
Expected: aucun échec.

- [ ] **Step 2: Projet Vercel unique relié à GitHub**

```bash
npx vercel link --yes --project cahieractif
npx vercel git connect https://github.com/jfb4plai/CahierActif
git push origin main
```

Expected: un seul projet `cahieractif` (vérifier `npx vercel project ls` : pas de doublon `cahier-actif` créé par l'intégration GitHub ; le cas échéant, supprimer le doublon avec `npx vercel remove <nom> --yes`).

- [ ] **Step 3: Sous-domaine**

```bash
npx vercel domains add cahieractif.jfb4plai.com cahieractif
```

Vérifier : `npx vercel domains inspect cahieractif.jfb4plai.com` puis ouvrir https://cahieractif.jfb4plai.com. (Si la commande diffère dans la version installée du CLI, ajouter le domaine depuis le tableau de bord Vercel → projet cahieractif → Settings → Domains.)

- [ ] **Step 4: Recette JF sur les trois appareils**

URL : https://cahieractif.jfb4plai.com

| # | Vérification | PC Chrome/Edge | iPad (installée) | Android (installée) |
|---|---|---|---|---|
| 1 | Installation (icône sur l'écran d'accueil / bureau) | | | |
| 2 | Ouvrir un PDF de fiche réelle, rendu net | | | |
| 3 | Écrire au stylet / souris, le doigt fait défiler après le stylet | | | |
| 4 | Zone de texte au clavier, corrigée après coup | | | |
| 5 | Gomme et gomme fine, Annuler | | | |
| 6 | Fond Seyes et quadrillé sur page vierge | | | |
| 7 | Export PDF via la feuille de partage (Teams / mail), annotations bien placées | | | |
| 8 | Fichier .cahier repris sur un autre appareil | | | |
| 9 | Mode avion : l'app s'ouvre et le document est là | | | |

- [ ] **Step 5: Consigner et mettre à jour la mémoire**

Ajouter les résultats à `docs/recette-plan-1.md`, commit, push. Mettre à jour `memory/cahieractif-session-prompt.md` (plan 1 livré, URL, résultats de l'essai gestes, prochaine étape : rédaction des plans 2 à 4).

```bash
git add docs/recette-plan-1.md
git commit -m "docs: recette plan 1 sur PC, iPad, Android"
git push origin main
```

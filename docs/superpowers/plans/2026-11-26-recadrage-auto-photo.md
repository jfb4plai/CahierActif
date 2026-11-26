# Recadrage et redressement automatiques des photos — plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Après chaque photo ou import, ouvrir l'écran de recadrage avec les 4 coins de la feuille déjà détectés ; un geste valide ou corrige.

**Architecture:** une fonction pure de détection (`detectionFeuille.ts`) ; l'écran existant `RedresserPhoto` reçoit des coins initiaux et un mode « import » ; un nouveau composant `RecadrerPhotos` fait défiler les photos une à une, branché dans `Bibliotheque.importerPhotos` et `Editeur.ajouterPhotos`.

**Tech Stack:** React 18, TypeScript, Vite, vitest (aucune nouvelle dépendance).

**Spec:** `docs/superpowers/specs/2026-11-26-recadrage-auto-photo-design.md`

## Global Constraints
- Local uniquement : aucune image n'est envoyée à un serveur ; pas d'OpenCV.js.
- Détection douteuse → `null` → coins = image entière (comportement actuel).
- Boutons ≥ 44 px, texte ≥ 16 px, consignes à l'infinitif, niveaux FWB sans CP/CE1.
- `npx vite build` (script `npm run build`) doit passer avant tout push ; branche `main` ; pas de `git add .`.

## Review Focus
1. Feuille inclinée de plus de 45° : coins extrêmes faux → rejet par `estConvexe`/aire, pas de cadrage tordu.
2. Photo toute blanche, toute noire ou sans feuille : `null`, jamais d'exception.
3. Feuille coupée par le bord de la photo : coins sur le bord, valides.
4. Annuler au milieu de 5 photos : aucune page créée, rien d'enregistré.
5. Photo déjà réduite à 2200 px (`PHOTO_COTE_MAX_PX`) : détection sur copie réduite, coins remis à l'échelle de la photo complète.

---

### Task 1: Détection des coins (fonction pure)

**Files:**
- Create: `src/lib/detectionFeuille.ts`
- Test: `src/lib/detectionFeuille.test.ts`

**Interfaces:**
- Consumes: `Pixels`, `Quad`, `estConvexe` de `src/lib/redressement.ts`.
- Produces: `detecterCoins(src: Pixels): Quad | null` (coordonnées dans le repère de `src`, ordre haut-gauche, haut-droit, bas-droit, bas-gauche) ; `detecterCoinsPhoto(image: ImageSource): Promise<Quad | null>` (navigateur : décode, réduit à ~400 px, appelle `detecterCoins`, remet à l'échelle).

- [ ] **Step 1: Tests (images synthétiques construites dans le test)** : `détecte une feuille blanche droite sur fond sombre` (coins à ±3 px), `détecte une feuille inclinée de 15°`, `ignore le texte noir sur la feuille` (trous comblés), `renvoie null pour une image uniforme`, `renvoie null si la zone claire fait moins de 25 % de l'image`, `renvoie null si la zone claire fait plus de 98 %`, `feuille coupée par le bord : coins sur le bord`, `feuille inclinée à 60° : null ou quadrilatère convexe`.
- [ ] **Step 2:** `npx vitest run src/lib/detectionFeuille.test.ts` → FAIL (module absent).
- [ ] **Step 3: Implémenter `detecterCoins`** : réduire à ≤ 400 px de grand côté (moyenne par blocs), gris, flou boîte 3×3, seuil d'Otsu, plus grande composante claire (4-connexité), combler ses trous (fond non relié au bord), coins = points extrêmes (min x+y, max x−y, max x+y, min x−y), remise à l'échelle ; `null` si aire hors [25 %, 98 %] ou `!estConvexe`.
- [ ] **Step 4: Implémenter `detecterCoinsPhoto`** (même décodage que `redresserPhoto`, `createImageBitmap` + canvas) ; toute erreur → `null`.
- [ ] **Step 5:** `npx vitest run src/lib/detectionFeuille.test.ts` → PASS. Commit : `feat: détection automatique des coins d'une feuille photographiée`.

### Task 2: RedresserPhoto accepte des coins initiaux et le mode import

**Files:**
- Modify: `src/ui/RedresserPhoto.tsx` (Props l.5-10 ; `onLoad` l.~118 ; en-tête et boutons l.~91-100)
- Test: `src/ui/RedresserPhoto.test.tsx` (si l'environnement de test DOM existe ; sinon test de la fonction pure ci-dessous)

**Interfaces:**
- Consumes: `Quad`, `quadComplet`.
- Produces: props optionnelles ajoutées à `RedresserPhoto` : `quadInitial?: Quad | null` ; `import?: { rang: number; total: number; detecte: boolean; onGarder: () => void }`. Sans ces props, comportement identique à aujourd'hui.

- [ ] **Step 1: Test** : `utilise quadInitial au chargement à la place de quadComplet` ; `en mode import, le texte sur les annotations supprimées est absent` ; `en mode import, « Garder tel quel » appelle onGarder`.
- [ ] **Step 2:** lancer le test → FAIL.
- [ ] **Step 3: Implémenter** : dans `onLoad`, `setQuad(quadInitial ?? quadComplet(l, h))` ; en mode import, titre « Photo {rang} sur {total} », bouton « Garder tel quel » (appelle `onGarder`), message `detecte ? 'Feuille détectée : vérifier les coins puis appliquer.' : 'Feuille non détectée : placer les coins sur la feuille.'`, et suppression de la phrase « Les annotations de cette page seront supprimées ».
- [ ] **Step 4:** test → PASS. Commit : `feat: RedresserPhoto accepte des coins initiaux et un mode import`.

### Task 3: File d'attente de recadrage + branchement

**Files:**
- Create: `src/ui/RecadrerPhotos.tsx`
- Modify: `src/ui/Bibliotheque.tsx:126-136` (`importerPhotos`) ; `src/ui/Editeur.tsx:308-317` (`ajouterPhotos`)
- Test: `src/ui/RecadrerPhotos.test.tsx` (ou test de la logique de file extraite en fonction pure)

**Interfaces:**
- Consumes: `detecterCoinsPhoto`, `RedresserPhoto` (Task 2), `ImageSource`, `TaillePage`.
- Produces: `RecadrerPhotos({ images, tailles, onTermine, onAnnuler })` avec `onTermine(images: ImageSource[], tailles: TaillePage[])` ; `onAnnuler()` abandonne tout.

- [ ] **Step 1: Test** : `traite les photos dans l'ordre`, `Garder tel quel conserve image et taille d'origine`, `Appliquer remplace image et taille`, `Annuler n'appelle pas onTermine`.
- [ ] **Step 2:** test → FAIL.
- [ ] **Step 3: Implémenter `RecadrerPhotos`** : état `rang` ; pour chaque photo, `detecterCoinsPhoto` puis `RedresserPhoto` en mode import ; à la fin, `onTermine`.
- [ ] **Step 4: Brancher** : `importerPhotos` et `ajouterPhotos` appellent `preparerPhotos`, mémorisent le résultat dans un état `aRecadrer`, affichent `RecadrerPhotos`, et ne créent le document / n'ajoutent les pages (`nouveauDocPhotos`, `ajouterPagesPhotos`) qu'au `onTermine`.
- [ ] **Step 5:** `npm test` et `npm run build` → verts. Commit : `feat: recadrage automatique après chaque photo`.

### Task 4: Parcours réel

- [ ] **Step 1:** `npm run dev`, importer une vraie photo de feuille sur bureau (fichier fourni par JF ou capture) : écran de recadrage, coins détectés, Appliquer, page redressée, annotation possible.
- [ ] **Step 2:** importer 3 photos d'un coup, Garder tel quel sur la 2e, Annuler sur un second essai : aucune page créée.
- [ ] **Step 3:** noter « Parcours testé : étapes, résultat constaté » ; sinon « non vérifié ». Push `main` après build vert (autorisation durable).

# CahierActif — spécification de conception (v1)

Date : 2026-10-09 · Statut : validée en brainstorming, à relire par JF

## 1. Objectif

Modernisation de ToutEnClic (FBajard / bipede.fr, ressources-ecole-inclusive.org) : l'élève travaille à l'écran sur une fiche numérique comme sur un cahier. Compensation du geste graphique (dyspraxie, dysgraphie, troubles DYS), du fondamental (P1) au secondaire (S6), avec attention particulière à la géométrie et aux maths.

### Limites de ToutEnClic corrigées

| ToutEnClic | CahierActif |
|---|---|
| Images seules, PDF à convertir via service en ligne | PDF natif + photo de feuille, aucun service tiers |
| Annotations rasterisées (non corrigeables) | Annotations vectorielles, chaque objet modifiable |
| Install Python / version portable Windows | PWA installable PC, iPad, Android, hors ligne |
| Pas d'optimisation stylet / tactile | Pointer Events, rejet paume, gestes deux doigts |
| Maths = tracé seul | Opérations posées, fractions, éditeur d'expressions, repère |
| Pas d'export PDF | Export PDF annoté + fichier `.cahier` |
| Pas de lecture vocale | Synthèse vocale locale |

### Conservé de ToutEnClic

Instruments (règle, équerre, rapporteur, compas, loupe), page vierge, annulation multiple, impossibilité de quitter par erreur (mode verrouillé).

## 2. Décisions de cadrage

- **Utilisateur v1** : élève seul, autonome, sans compte ni serveur. v2 : rattachement HubActif (dépôt enseignant, copie rendue). Architecture v1 prépare la v2 (adaptateur de stockage).
- **Une PWA, pas trois apps** : deux réglages indépendants — **niveau** (fondamental / secondaire, pilote les outils) et **mode d'entrée** (souris / stylet-tactile, pilote l'interaction). Emballage natif (Capacitor) possible plus tard sans réécriture.
- **Aucune donnée hors de l'appareil** : pas de Supabase, pas d'`/api`, pas d'IA.
- **Géométrie** : instruments simulés en v1, mode assisté (constructions par points) en v1.1, activable comme aménagement.
- **Maths** : main levée + gabarits structurés, filtrés par niveau. Pas de reconnaissance manuscrite.
- **Aucune vérification ni proposition de résultat** : l'outil compense le geste, pas le raisonnement.

## 3. Architecture

Stack : React 18 + Vite 5 + Tailwind v3, branding PLAI (`plai-style.css`, logo, DM Sans / DM Serif Display).

| Brique | Rôle | Licence |
|---|---|---|
| pdf.js | Rendu PDF, couche texte (surlignage aligné, lecture vocale) | Apache 2.0 |
| Konva | Couche d'annotations vectorielles | MIT |
| MathLive | Éditeur d'expressions + clavier mathématique | MIT |
| pdf-lib | Export PDF annoté | MIT |
| IndexedDB (idb) | Sauvegarde automatique locale | — |
| Workbox (vite-plugin-pwa) | PWA, hors ligne | MIT |

### Modèle de document

```
Document {
  id, titre, niveau, créé, modifié
  source: { type: 'pdf' | 'photos' | 'vierge', blob(s) }
  pages: [{ index, largeurMm, hauteurMm, fond?: 'quadrille5'|'quadrille10'|'seyes'|'pointe', objets: Objet[] }]
  historique: pile annuler / rétablir (par document)
}
Objet = trait | texte | surlignage | point | operationPosee | fraction | expression | repere
  (chaque objet : id, type, position en mm page, style, données propres)
```

Positions stockées en **millimètres page**, conversion vers pixels à l'affichage selon zoom : garantit l'échelle réelle des instruments et l'indépendance au zoom.

### Stockage

Interface unique `StorageAdapter` (`list`, `load`, `save`, `delete`). v1 : `IndexedDBAdapter`. v2 : adaptateur serveur HubActif branché sans toucher au reste.

### Sorties

1. Sauvegarde automatique (IndexedDB, à chaque modification, débouncée).
2. Export PDF annoté (pdf-lib, annotations aplaties, cache-ligne exclu), via Web Share API si disponible, sinon téléchargement.
3. Fichier `.cahier` (zip : source + JSON objets) pour reprise sur un autre appareil.

## 4. Module géométrie (v1)

- Instruments : règle graduée cm/mm, équerre, rapporteur double graduation 0-180, compas, loupe.
- Tablette : un doigt déplace, deux doigts font pivoter ; le stylet trace ; si un stylet a été détecté, le doigt ne trace jamais.
- Ordi : glisser souris, poignée de rotation + molette, clic pour tracer.
- Règle / équerre : trait commencé près du bord accroché au bord, longueur affichée en direct (cm, 1 décimale).
- Compas : pointe posée, écartement réglable (rayon affiché), arc partiel suivant le geste de l'élève.
- Rapporteur : centrage sur un sommet, lecture par l'élève, pas de mesure automatique.
- Échelle réelle : 1 cm de règle = 1 cm sur la feuille imprimée, quel que soit le zoom.
- Points nommés (croix + étiquette), point d'accroche pour compas et règle. Pas d'aimantation entre instruments.
- Risque : interception du pincement par Safari iPad → blocage du zoom page pendant la manipulation, testé en tâche 1 du plan.

**v1.1** : mode assisté (segment par 2 points, perpendiculaire, parallèle, cercle centre-rayon), activable par profil.

## 5. Écriture mathématique

| Outil | P1-P2 | P3-P6 | S1-S6 |
|---|---|---|---|
| Main levée (3 épaisseurs, 6 couleurs), gomme objet + partielle | oui | oui | oui |
| Fonds quadrillé 5 mm / 1 cm, Seyes, pointé | oui | oui | oui |
| Opérations posées + et − | oui | oui | oui |
| Opérations posées × et ÷ | — | oui | oui |
| Opérations posées décimales, division complète | — | — | oui |
| Fractions (cadre 2 cases) | — | oui | oui |
| Éditeur d'expressions MathLive (clavier simplifié ; complet en option) | — | — | oui |
| Repère cartésien (échelle, axes gradués, points avec coordonnées) | — | — | oui |

Opérations posées : grille en colonnes (~1 cm), colonnes unités/dizaines/centaines colorées (réglable), ligne de retenues au-dessus, saisie par pavé numérique à l'écran ou clavier. Aucun calcul ni correction.

P1-P2 : grandes icônes, outils non listés masqués.

## 6. Texte, lecture, photo, verrouillage

- **Zones de texte** : Arial, 14 pt par défaut (12-24), interligne 1,5, déplaçables, redimensionnables, éditables à tout moment.
- **Surligneurs** : 4 couleurs translucides ; alignés sur les mots si couche texte PDF, bande libre sinon.
- **Cache-ligne** : bande opaque avec fenêtre 1 à 3 lignes, déplaçable au doigt ou aux flèches, non exporté.
- **Lecture vocale** : `speechSynthesis`, voix fr, vitesse réglable ; lit le paragraphe PDF touché et les zones de texte de l'élève. Sans couche texte : message « Ce document est une image : la lecture vocale n'est pas disponible (prévu dans une prochaine version). »
- **Photo de feuille** : `getUserMedia` / `<input capture>`, recadrage 4 coins, correction de perspective et contraste en local (canvas), plusieurs photos = plusieurs pages.
- **Mode verrouillé** : activé dans les réglages, code adulte à 4 chiffres ; bloque « tout effacer », suppression de document, changement de niveau et de réglages ; confirmation avant de quitter un document ; `beforeunload` pour la fermeture. Limite annoncée : une app web ne peut pas empêcher la fermeture du navigateur ; sauvegarde continue → aucune perte.
- **Accessibilité interface** : texte ≥ 16 px, cibles tactiles ≥ 44 px, icônes libellées, contraste AA, palette PLAI.

## 7. Gestion d'erreurs

- PDF protégé ou corrompu : message clair, pas de plantage.
- PDF > 50 pages : rendu paresseux des pages visibles.
- Stockage plein / éviction Safari : avertissement à la première ouverture sur iPad (« installez CahierActif sur l'écran d'accueil »), rappel d'export `.cahier`.
- Échec d'export : nouvel essai possible, document local jamais altéré.

## 8. Tests

- Unitaires (Vitest) : modèle de document, annuler/rétablir, conversion mm ↔ px, sérialisation `.cahier`, export PDF.
- Recette manuelle sur matériel réel : PC Windows (Chrome, Edge), iPad + Apple Pencil (Safari, app installée), tablette Android + stylet (Chrome).
- Gestes iPad testés dès la première tâche du plan.

## 9. Livraison

- Dossier : `C:\Users\jfbeg\OneDrive\claude-workspace\cahieractif\`
- GitHub : `jfb4plai/CahierActif`, branche `main`, licence PolyForm NC.
- Vercel : `cahieractif.jfb4plai.com`.
- Vignette `portail-plai/src/data/apps.ts`.
- Mode d'emploi HTML `plai-style.css` en deux volets : enseignant (préparer un PDF, poser le verrouillage), élève (pictos, phrases courtes, consignes à l'infinitif, une action par puce).
- Exemples et vocabulaire FWB (CEB, écoles fondamentales et secondaires).

## 10. Références scientifiques

L'app n'en cite aucune. Toute référence de la vignette ou du mode d'emploi (dyspraxie, dysgraphie, compensation numérique) est vérifiée dans RISS (`mcp__RISS__search_articles`) avant écriture ; sinon mention « réel, hors corpus RISS ».

## 11. Hors périmètre v1

- Mode géométrie assisté → v1.1
- OCR local des scans (Tesseract.js) → v1.1
- Rattachement HubActif, comptes, copies rendues → v2
- Reconnaissance d'écriture manuscrite → non prévu
- Vérification / correction automatique → exclu par principe

## 12. Points d'incertitude

- Persistance IndexedDB d'une PWA installée sur iPad : en principe exemptée de l'éviction 7 jours, à confirmer sur appareil.
- Rendu de la pression stylet (Apple Pencil, S-Pen) via Pointer Events : à mesurer en recette.
- Poids de MathLive (~1 Mo) : chargement différé, uniquement en profil secondaire.

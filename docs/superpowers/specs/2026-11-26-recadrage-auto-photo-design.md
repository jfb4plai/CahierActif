# Recadrage et redressement automatiques des photos — conception courte

Date : 2026-11-26. Demande de JF : après une photo, pouvoir recadrer/redresser, avec cadrage automatique comme Microsoft Lens.

## Constat (code lu)
- Le redressement manuel existe : `src/lib/redressement.ts` (homographie, `redresserPhoto`), `src/ui/RedresserPhoto.tsx` (4 coins à placer), appelé seulement depuis `GestionPages.tsx:99`.
- Les photos entrent par `Bibliotheque.importerPhotos` (l.126) et `Editeur.ajouterPhotos` → `preparerPhotos` (`src/lib/photo.ts`) : aucun écran de recadrage entre la prise et la page.

## But
L'élève ou l'enseignant photographie une feuille ; les 4 coins sont déjà posés sur la feuille ; un geste suffit à valider ou corriger.

## Objectifs
1. Détecter automatiquement les 4 coins de la feuille, en local (aucun envoi d'image).
2. Ouvrir l'écran de recadrage après chaque photo/import, coins pré-placés, avec « Garder tel quel ».

## Non-objectifs / anti-objectifs
- Pas d'OpenCV.js dans cette étape (≈ 8 Mo) : seulement si les essais sur de vraies photos échouent.
- Aucune détection ne doit enlever le contrôle : en cas de doute, coins = image entière (comportement actuel), jamais un cadrage faux présenté comme sûr.
- Pas d'amélioration du contraste/« scan noir et blanc » (hors demande).

## Approches
- A. Détection maison (seuil de luminosité, plus grande zone claire, coins extrêmes) : léger, testable, limité sur feuille blanche/bureau blanc. **Retenue.**
- B. OpenCV.js : plus robuste, 8 Mo, chargement lent sur tablette. Reportée.
- C. Écran de recadrage seul, sans détection : ne répond pas à « automatique ».

## Conception
**Détection** — nouveau `src/lib/detectionFeuille.ts`, fonction pure `detecterCoins(pixels): Quad | null` :
réduction à ~400 px, gris, flou, seuil d'Otsu, plus grande zone claire (trous du texte comblés), coins = points extrêmes (x+y, x−y), remis à l'échelle. Rejet (null) si aire < 25 % ou > 98 % de l'image, ou quadrilatère non convexe (`estConvexe`).
**Flux** — après `preparerPhotos`, file d'attente : pour chaque photo, `RedresserPhoto` s'ouvre avec les coins détectés (ou image entière si null, avec message « Feuille non détectée : placer les coins »). Boutons : Appliquer / Garder tel quel. Page créée seulement après la file. Même flux dans `Bibliotheque` et `Editeur`.
**Réutilisation** : `RedresserPhoto`, `redresserPhoto`, `quadComplet`, `estConvexe` inchangés (ajout d'une prop `quadInitial` et d'un libellé de file « photo 2 sur 5 »).

## Vérification prévue
Tests vitest sur images synthétiques (feuille blanche inclinée sur fond sombre, feuille avec texte, fond clair → null). Test réel : photo d'une feuille sur un bureau, à `file://` et à l'URL publique. Les photos réelles de classe ne sont pas disponibles : taux de réussite = **non vérifié** jusqu'à essai par JF.

## Laissé au constructeur
Paramètres de flou/seuil, libellés exacts, gestion du bouton Retour pendant la file.
